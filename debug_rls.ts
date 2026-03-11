import { createAdminClient } from './src/lib/supabase/admin';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugReports() {
    const supabase = createAdminClient();

    // 1. Check all reports
    const { data: allReports, error: e1 } = await supabase
        .from('reports')
        .select('id, test_run_id, executive_summary');

    console.log('Total reports in DB:', allReports?.length || 0);
    if (allReports && allReports.length > 0) {
        console.log('First report test_run_id:', allReports[0].test_run_id);
    }

    // 2. Check the specific test run
    const testRunId = 'a3281c5a-f984-4182-b1c5-79e151b57a56';
    const { data: specificRun, error: e2 } = await supabase
        .from('test_runs')
        .select('*, projects(user_id)')
        .eq('id', testRunId)
        .single();

    console.log('Test Run exists:', !!specificRun);
    if (specificRun) {
        console.log('Project User ID:', specificRun.projects.user_id);
    }

    // 3. Check report for this run
    const { data: specificReport, error: e3 } = await supabase
        .from('reports')
        .select('*')
        .eq('test_run_id', testRunId)
        .maybeSingle();

    console.log('Report for run exists:', !!specificReport);
}

debugReports();
