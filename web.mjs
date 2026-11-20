import {compare} from './src/diff.mjs';import {markdown,sarif} from './src/report.mjs';
const $=id=>document.getElementById(id);let result=null,lang='en',inputVersion=0;
const ar={eyebrow:'راجع التغيير. واحتفظ بالقرار.',intro:'إيه اتغيّر في صلاحيات الوكيل؟ قارن ملفي إعدادات مع أدلة على مستوى السطور. التحليل بيتم داخل المتصفح.',sample:'جرّب المثال الجاهز',format:'صيغة الإعدادات',before:'الإعدادات قبل التغيير',after:'الإعدادات بعد التغيير',compare:'قارن الصلاحيات',privacy:'بدون حساب أو موديل أو رفع إعدادات. التقارير لا تتضمن قيم الإعدادات، بما فيها الأسرار.',ready:'حمّل المثال أو أضف ملفي JSON للبدء.',scope:'نفحص التغييرات المعلنة، وليس الوصول الفعلي. الإعدادات الأخرى وخيارات التشغيل وسلوك الخادم وروابط الملفات قد تغيّر النتيجة. الحقول غير المدعومة موضحة صراحة.'};
const en=Object.fromEntries([...document.querySelectorAll('[data-t]')].map(e=>[e.dataset.t,e.textContent]));
Object.assign(ar, {
  taskTitle:'سياسة المهمة (اختيارية)',
  taskLabel:'سياسة المهمة بصيغة JSON',
  taskHelp:'اكتبي هدف المهمة وحددي كل قاعدة صلاحية بالنص الكامل. استخدمي required للمطلوبة، وapproval_required للي تحتاج موافقة، وout_of_scope للي خارج النطاق. المثال الجاهز يوضح الصيغة.'
});
const taskNeeds = {
  en: {required:'Required',approval_required:'Requires approval',out_of_scope:'Out of scope',unknown:'Unknown'},
  ar: {required:'مطلوبة',approval_required:'تحتاج موافقة',out_of_scope:'خارج نطاق المهمة',unknown:'غير معروف'}
};
function clear(){
  inputVersion++;
  result=null;
  $('exportText').value='';
  $('exportPreview').hidden=true;
  $('taskSummary').hidden=true;
  $('findings').replaceChildren();
  $('status').textContent=(lang==='ar'?ar:en).ready;
  for(const x of ['json','md','sarif'])$(x).disabled=true;
}
function render(){
  if(!result)return;
  $('status').textContent=lang==='ar'?`${result.findings.length} تغييرات · ${result.verdict==='review_required'?'تحتاج مراجعة':'لا توجد تغييرات بمستوى المراجعة'} · ${result.coverage.status==='partial'?'التغطية جزئية':'الحقول المدعومة فقط'}`:`${result.findings.length} changes · ${result.verdict} · Coverage: ${result.coverage.status}`;
  const task = result.task_review;
  $('taskSummary').hidden = !task;
  if(task){
    const line = task.goal_evidence.line;
    $('taskSummary').textContent = lang==='ar'
      ? `هدف المهمة في السطر ${line} من سياسة المهمة. الوصول الفعلي غير معروف.`
      : `Task goal at policy line ${line}. Effective access is unknown.`;
  }
  $('findings').replaceChildren();
  for(const finding of result.findings){
    const box=document.createElement('div');
    box.className='finding';
    const title=document.createElement('strong');
    title.textContent=`${finding.severity.toUpperCase()} / ${finding.code}`;
    const message=document.createElement('p');
    message.textContent=finding.message;
    const loc=document.createElement('small');
    loc.textContent=lang==='ar'?`السطر قبل التغيير: ${finding.evidence.before.line} ← بعد التغيير: ${finding.evidence.after.line}`:`Before line ${finding.evidence.before.line} → After line ${finding.evidence.after.line}`;
    box.append(title,message,loc);
    if(finding.task_review){
      const review = finding.task_review;
      const fit = document.createElement('p');
      fit.className = 'task-fit';
      fit.textContent = taskNeeds[lang][review.need];
      if(review.policy_evidence){
        fit.textContent += lang==='ar' ? ` · سطر السياسة ${review.policy_evidence.line}` : ` · Policy line ${review.policy_evidence.line}`;
      }
      const action = document.createElement('p');
      action.lang='en';
      action.dir='ltr';
      action.textContent=review.recommendation;
      box.append(fit,action);
    }
    $('findings').appendChild(box);
  }
  for(const x of ['json','md','sarif'])$(x).disabled=false;
}
$('lang').onclick=()=>{lang=lang==='en'?'ar':'en';document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';$('lang').textContent=lang==='ar'?'English':'العربية';document.querySelectorAll('[data-t]').forEach(e=>e.textContent=(lang==='ar'?ar:en)[e.dataset.t]);render();};
$('sample').onclick=async()=>{
  const version=inputVersion;
  $('sample').disabled=true;
  try{
    const [before,after,task]=await Promise.all(['before','after','policy'].map(async name=>{
      const response=await fetch(`./examples/task-${name}.json`);
      if(!response.ok)throw new Error('Example unavailable');
      return response.text();
    }));
    if(version!==inputVersion)return;
    $('before').value=before;
    $('after').value=after;
    $('task').value=task;
    $('taskPanel').open=true;
    $('format').value='auto';
    clear();
  }catch{
    if(version===inputVersion){
      clear();
      $('status').textContent=lang==='ar'?'المثال غير متاح دلوقتي.':'The worked example is unavailable.';
    }
  }finally{
    $('sample').disabled=false;
  }
};
for(const [file,editor]of [['fileBefore','before'],['fileAfter','after']])$(file).onchange=async()=>{clear();const f=$(file).files[0];if(!f)return;$(editor).value='';if(f.size>2000000){$('status').textContent='File exceeds 2 MB.';return;}try{$(editor).value=new TextDecoder('utf-8',{fatal:true}).decode(await f.arrayBuffer());}catch{$('status').textContent='File must contain valid UTF-8 JSON.';}};
for(const x of ['before','after','task'])$(x).oninput=clear;$('format').onchange=clear;
$('compare').onclick=()=>{
  clear();
  try{
    const task=$('task').value;
    result=compare($('before').value,$('after').value,{format:$('format').value,task:task.trim()?task:undefined});
    render();
  }catch(e){
    $('status').textContent=(lang==='ar'?'خطأ في المدخلات: ':'Input error: ')+e.message;
  }
};
for(const [button,format]of [['json','json'],['md','md'],['sarif','sarif']])$(button).onclick=()=>{if(!result)return;const text=format==='md'?markdown(result):JSON.stringify(format==='sarif'?sarif(result):result,null,2);$('exportText').value=text;$('exportPreview').hidden=false;$('exportPreview').open=true;const url=URL.createObjectURL(new Blob([text],{type:format==='md'?'text/markdown':'application/json'}));const a=document.createElement('a');a.href=url;a.download=`monna-permission-diff.${format}`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
