'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { Orchestrator } from '@/lib/engine/orchestrator';
import { encrypt } from '@/lib/utils/vault';

export async function createTestRun(formData: {
    url: string;
    scope: string;
    requiresAuth: boolean;
    executionMode: 'autonomous' | 'manual';
    llmProvider: 'ollama' | 'gemini';
    geminiKey?: string;
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
            encrypted_llm_key: formData.geminiKey ? encrypt(formData.geminiKey) : null,
            save_llm_key: !!formData.geminiKey
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

            // Launch Orchestrator (Fire and forget for Phase 1)
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

            orchestrator.runSession(session.id, formData.url, personaProfile).catch(err => {
                console.error(`Autonomous session ${session.id} failed:`, err);
            });
        }
    }

    redirect('/dashboard');
}
