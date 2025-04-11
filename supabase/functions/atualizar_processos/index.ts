import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  try {
    const raw = await req.text();
    const body = JSON.parse(
      raw.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
         .replace(/[\r\n\t]+/g, ' ')
    );

    const { tjsp, reu, superior, decisao, movimentacao, link } = body;

    if (!tjsp) {
      return new Response(JSON.stringify({ error: 'Campo tjsp é obrigatório' }), { status: 400 });
    }

    // Atualiza tabela processos
    const { error: updateError } = await supabaseClient
      .from('processos')
      .update({ reu, superior, decisao, movimentacao, link })
      .eq('tjsp', tjsp);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
    }

    // Insere nova linha em pesquisas
    const { error: insertError } = await supabaseClient
      .from('pesquisas')
      .insert({ tjsp, decisao, movimentacao });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'JSON inválido', detalhes: e.message }), {
      status: 400
    });
  }
});
