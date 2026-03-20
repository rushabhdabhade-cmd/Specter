'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { Orchestrator } from '@/lib/engine/orchestrator';
import { BrowserService } from '@/lib/engine/browser';
import { LLMService } from '@/lib/engine/llm';
import { PersonaProfile } from '@/lib/engine/types';
import { encrypt } from '@/lib/utils/vault';
import crypto from 'crypto';

export async function createTestRun(formData: {
    url: string;
    scope: string;
    requiresAuth: boolean;
    executionMode: 'autonomous' | 'manual';
    llmProvider: 'ollama' | 'gemini' | 'openrouter';
    llmApiKey?: string;
    llmModelName?: string;
    credentials?: {
        username?: string;
        password?: string;
    };
    personas: any[];
}) {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Ensure user exists in Supabase (JIT Sync using Admin client)
    const { data: userRecord } = await adminSupabase.from('users').select('id').eq('id', userId).single();

    if (!userRecord) {
        const { currentUser } = await import('@clerk/nextjs/server');
        const user = await currentUser();
        if (user) {
            await (adminSupabase.from('users') as any).insert({
                id: userId,
                email: user.emailAddresses[0].emailAddress,
                name: `${user.firstName} ${user.lastName}`.trim(),
                plan_tier: 'pro'
            });
        } else {
            throw new Error('User sync failed. Please refresh the page.');
        }
    }

    const llmApiKey = formData.llmApiKey || (formData.llmProvider === 'gemini' ? process.env.GEMINI_API_KEY : undefined);

    // 2. Create or find Project (including credentials)
    const { data: project, error: pError } = await (adminSupabase
        .from('projects') as any)
        .upsert({
            user_id: userId,
            name: `Project for ${new URL(formData.url).hostname}`,
            target_url: formData.url,
            requires_auth: formData.requiresAuth,
            auth_credentials: formData.credentials ? JSON.stringify(formData.credentials) : null,
            llm_provider: formData.llmProvider,
            llm_model_name: formData.llmModelName || null,
            encrypted_llm_key: llmApiKey ? encrypt(llmApiKey) : null,
            save_llm_key: !!llmApiKey
        }, { onConflict: 'user_id,target_url' })
        .select()
        .single();

    if (pError || !project) {
        console.error('Project upsert error:', pError);
        throw pError || new Error('Failed to create project');
    }

    // 3. Create Test Run
    const { data: testRun, error: tError } = await (adminSupabase
        .from('test_runs') as any)
        .insert({
            project_id: (project as any).id,
            status: 'pending',
        })
        .select()
        .single();

    if (tError || !testRun) {
        console.error('Test run error:', tError);
        throw tError || new Error('Failed to create test run');
    }

    // 4. Create Personas and Sessions
    for (const p of formData.personas) {
        const { data: config, error: cError } = await (adminSupabase
            .from('persona_configs') as any)
            .insert({
                project_id: (project as any).id,
                user_id: userId,
                name: p.name,
                geolocation: p.geolocation,
                age_range: p.ageRange,
                tech_literacy: p.techLiteracy.toLowerCase().includes('low') ? 'low' :
                    p.techLiteracy.toLowerCase().includes('high') ? 'high' : 'medium',
                domain_familiarity: p.domainFamiliarity,
                goal_prompt: p.prompt,
                persona_count: p.personaCount || 1,
            })
            .select()
            .single();

        if (cError || !config) {
            console.error('Error creating persona config:', cError);
            continue;
        }

        // Create a session for each persona based on the count
        const count = p.personaCount || 1;
        for (let i = 0; i < count; i++) {
            const { data: session, error: sError } = await (adminSupabase.from('persona_sessions') as any).insert({
                test_run_id: (testRun as any).id,
                persona_config_id: (config as any).id,
                status: 'queued',
                execution_mode: formData.executionMode
            }).select().single();

            if (sError || !session) {
                console.error('Error creating persona session:', sError);
                continue;
            }

            // Launch Orchestrator (Fire and forget - do NOT await here to avoid server action timeouts)
            const orchestrator = new Orchestrator();
            const personaProfile = {
                name: p.name,
                age_range: p.ageRange,
                geolocation: p.geolocation,
                tech_literacy: p.techLiteracy.toLowerCase().includes('low') ? 'low' :
                    p.techLiteracy.toLowerCase().includes('high') ? 'high' : 'medium',
                domain_familiarity: p.domainFamiliarity,
                goal_prompt: p.prompt,
            } as any;

            console.log(`🚀 Launching Orchestrator for session ${session.id}...`);
            orchestrator.runSession(session.id, formData.url, personaProfile).catch((err: any) => {
                console.error(`❌ Autonomous session ${session.id} failed:`, err);
            });
        }
    }

    redirect(`/test-runs/${(testRun as any).id}`);
}

export async function suggestAudienceArchetypes(formData: {
    url: string;
    llmProvider?: 'gemini' | 'openrouter' | 'ollama';
    llmApiKey?: string;
    llmModelName?: string;
}) {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const adminSupabase = createAdminClient();
    const cacheKey = `archetypes:${new URL(formData.url).href}`;

    try {
        const { data: cached } = await (adminSupabase
            .from('ai_caches') as any)
            .select('payload')
            .eq('cache_key', cacheKey)
            .single();

        if (cached && cached.payload) {
            console.log('✅ Found cached archetypes for URL:', formData.url);
            return cached.payload;
        }
    } catch (err) {
        // Proceed on cache miss
    }

    // Browser scraping always uses env Gemini key (Stagehand requirement)
    const browser = new BrowserService();
    let siteContext = "";

    try {
        await browser.init("gemini-2.0-flash", process.env.GEMINI_API_KEY);
        await browser.navigate(formData.url);
        const observation = await browser.observe();

        siteContext = `URL: ${formData.url}\nTitle: ${observation.title}\n`;
        if (observation.sections) {
            siteContext += observation.sections.map((s: any, i: number) => `Section ${i}: ${s.domContext}`).join('\n');
        }
        console.log('📄 Site context captured successfully.');
    } catch (err) {
        console.error('⚠️ Browser discovery failed for archetype suggestion fallback to URL:', err);
        siteContext = `URL: ${formData.url}`;
    } finally {
        await browser.close();
    }

    const provider = formData.llmProvider || 'gemini';
    const apiKey = formData.llmApiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY : undefined);
    const llm = new LLMService({ provider, apiKey, modelName: formData.llmModelName });

    const suggested = await llm.suggestArchetypes(siteContext);
    console.log(`🤖 LLM suggested ${(suggested as any).length || 0} archetypes.`);

    // Cache the result
    try {
        await (adminSupabase.from('ai_caches') as any).upsert({
            cache_key: cacheKey,
            payload: suggested,
            cache_type: 'archetypes'
        }, { onConflict: 'cache_key' });
    } catch (err) {
        console.error('Failed to cache archetypes:', err);
    }

    return suggested;
}

export async function generateAIPersonas(formData: {
    url: string;
    archetypes: string[];
    userPrompt: string;
    llmProvider?: 'gemini' | 'openrouter' | 'ollama';
    llmApiKey?: string;
    llmModelName?: string;
}) {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const adminSupabase = createAdminClient();
    const normalizedUrl = new URL(formData.url).href;
    const cacheKey = `personas:${normalizedUrl}`;

    try {
        const { data: cached } = await (adminSupabase
            .from('ai_caches') as any)
            .select('payload')
            .eq('cache_key', cacheKey)
            .single();

        if (cached && cached.payload) {
            console.log('✅ Found cached personas for:', normalizedUrl);
            return cached.payload;
        }
    } catch (err) {
        // Proceed on cache miss
    }

    // Browser scraping always uses env Gemini key (Stagehand requirement)
    const browser = new BrowserService();
    let siteContext = "";

    try {
        await browser.init("gemini-2.0-flash", process.env.GEMINI_API_KEY);
        await browser.navigate(formData.url);
        const observation = await browser.observe();

        siteContext = `URL: ${formData.url}\nTitle: ${observation.title}\n`;
        if (observation.sections) {
            siteContext += observation.sections.map((s: any, i: number) => `Section ${i}: ${s.domContext}`).join('\n');
        }
    } catch (err) {
        console.error('Browser discovery failed for persona generation:', err);
        siteContext = `URL: ${formData.url} (Manual discovery failed, using URL only)`;
    } finally {
        await browser.close();
    }

    const provider = formData.llmProvider || 'gemini';
    const apiKey = formData.llmApiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY : undefined);
    const llm = new LLMService({ provider, apiKey, modelName: formData.llmModelName });

    const personas = await llm.generatePersonas(siteContext, formData.userPrompt, formData.archetypes);
    console.log(`👥 LLM generated ${personas.length} personas.`);

    const result = personas.map((p: any, idx: number) => ({
        id: idx + 1,
        name: p.name || `Persona ${idx + 1}`,
        geolocation: p.geolocation || 'Global',
        ageRange: p.age_range || '25-45',
        techLiteracy: p.tech_literacy ? (p.tech_literacy.charAt(0).toUpperCase() + p.tech_literacy.slice(1)) : 'Medium',
        domainFamiliarity: p.domain_familiarity || 'Average',
        prompt: p.goal_prompt || 'Explore the site',
        personaCount: 1
    }));

    // Cache the result (upsert overwrites stale entry on regenerate)
    try {
        await (adminSupabase.from('ai_caches') as any).upsert({
            cache_key: cacheKey,
            payload: result,
            cache_type: 'personas'
        }, { onConflict: 'cache_key' });
    } catch (err) {
        console.error('Failed to cache personas:', err);
    }

    return result;
}
