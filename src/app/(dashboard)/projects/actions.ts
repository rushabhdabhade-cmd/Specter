'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function createTestRun(formData: {
    url: string;
    scope: string;
    personas: any[];
}) {
    const supabase = await createClient();

    // 1. Get current user (For now, we'll try to find a placeholder user or create one if it doesn't exist)
    // In a real app, this would be from Auth.
    const { data: { user } } = await supabase.auth.getUser();

    // FALLBACK for development without Auth set up yet
    let userId = user?.id;
    if (!userId) {
        const { data: firstUser } = await supabase.from('users').select('id').limit(1).single();
        userId = firstUser?.id;
    }

    if (!userId) {
        throw new Error('User not found. Please ensure at least one user exists in the "users" table.');
    }

    // 2. Create or find Project
    const { data: project, error: pError } = await supabase
        .from('projects')
        .upsert({
            user_id: userId,
            name: `Project for ${new URL(formData.url).hostname}`,
            target_url: formData.url,
        }, { onConflict: 'target_url' })
        .select()
        .single();

    if (pError || !project) throw pError || new Error('Failed to create project');

    // 3. Create Test Run
    const { data: testRun, error: tError } = await supabase
        .from('test_runs')
        .insert({
            project_id: project.id,
            status: 'pending',
        })
        .select()
        .single();

    if (tError || !testRun) throw tError || new Error('Failed to create test run');

    // 4. Create Personas and Sessions
    for (const p of formData.personas) {
        const { data: config, error: cError } = await supabase
            .from('persona_configs')
            .insert({
                project_id: project.id,
                name: p.name,
                geolocation: p.geolocation,
                age_range: p.ageRange,
                tech_literacy: p.techLiteracy.toLowerCase().includes('low') ? 'low' :
                    p.techLiteracy.toLowerCase().includes('high') ? 'high' : 'medium',
                goal_prompt: p.prompt,
            })
            .select()
            .single();

        if (cError || !config) continue;

        await supabase.from('persona_sessions').insert({
            test_run_id: testRun.id,
            persona_config_id: config.id,
            status: 'queued',
        });
    }

    redirect('/dashboard');
}
