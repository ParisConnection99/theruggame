export async function GET(request) {
    try {
      const response = await fetch('https://db.molrjroewztjwyiksluz.supabase.co');
      return new Response(JSON.stringify({ message: 'DNS resolved successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }