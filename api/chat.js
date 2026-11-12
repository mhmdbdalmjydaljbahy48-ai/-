export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { message, history, dataContext } = req.body; 
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key is missing in Vercel settings' });
  }
  
  const contents = [];
  if (history && history.length > 0) {
    history.forEach(msg => {
      contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] });
    });
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  let systemPrompt = "";
  if (dataContext) {
    systemPrompt = `
      أنت المساعد الذكي لنظام "FT" داخل لوحة تحكم العميل. 
      أنت خبير في تحليل البيانات وإدارة المتاجر والديون.
      تجيب على أسئلة العميل بلهجته وبنفس لغته، وتكون دقيقاً جداً في الأرقام.
      \n\n⚠️ هام جداً: هذه هي البيانات الحالية الحقيقية للعميل:
      ${dataContext}
      \n\nبناءً على هذه البيانات، أجب على سؤال العميل بدقة. لا تخترع أرقاماً من عندك.
    `;
  } else {
    systemPrompt = `
      أنت المساعد الذكي لنظام "FT لإدارة الأسواق والديون". 
      أنت ودود ومحترف.
      مهمتك الإجابة على استفسارات الزوار في الصفحة الرئيسية قبل تسجيل الدخول.
      ⚠️ هام جداً بخصوص اللغة: 
      إذا كتب لك الزائر بلهجة عامية (يمنية، خليجية، مصرية، إلخ)، قم بالرد عليه بنفس لهجته وبطريقة ودودة ومبسطة. 
      وإذا كتب بالفصحى، أجب بالفصحى.
      معلومات عن النظام:
      - نظام متكامل لإدارة المتاجر، المبيعات، الديون، والمخزون.
      - يحتوي أيضاً على قسم فردي لإدارة المصاريف، الدخل، وأهداف الادخار.
      - يتيح تسجيل الدخول للعملاء ومتابعة اشتراكاتهم.
      - الأسعار تختلف حسب الباقة، ويتم الاتصال بالإدارة للتجديد.
      - إذا سأل الزائر عن كيفية التسجيل، أرشده إلى الذهاب لصفحة "إنشاء حساب" وتعبئة البيانات.
      - إذا سألك عن سعر الاشتراك، أخبره أن الأسعار تظهر داخل النظام بعد التسجيل، أو تواصل مع الدعم.
      - لا تفتِ في أمور لا تخص النظام. كن مختصراً ومفيداً.
    `;
  }

  try {
    // ✅ تم تحديث النموذج إلى gemini-2.5-flash (أحدث وأكثر استقراراً)
    const fetchPromise = fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: contents
      })
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('API Timeout')), 8000)
    );

    const response = await Promise.race([fetchPromise, timeoutPromise]);
    const data = await response.json();
    
    if (!response.ok) {
      if (data.error?.message && data.error.message.includes('high demand')) {
        throw new Error('المساعد يواجه ضغطاً كبيراً، يرجى المحاولة بعد دقائق.');
      }
      throw new Error(data.error?.message || 'Error from Gemini API');
    }
    
    const aiResponse = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ reply: aiResponse });
    
  } catch (error) {
    if (error.message === 'API Timeout') {
       return res.status(500).json({ error: 'تأخر الرد من الخادم. يرجى المحاولة مرة أخرى.' });
    }
    return res.status(500).json({ error: 'حدث خطأ: ' + error.message });
  }
}
