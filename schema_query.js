const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://mogbzexqcatpgfrwzjld.supabase.co", "sb_publishable_AfPR3uNAwy0jjP4VLvZcQA_8Zml0U80");
async function run() {
  const { data, error } = await supabase.from('documents').select('*').limit(1);
  console.log("Documents:", error ? error.message : data);
}
run();
