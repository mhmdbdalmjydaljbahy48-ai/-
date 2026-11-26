export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { message, history, dataContext } = req.body; 
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'مفتاح OpenRouter غير موجود في إعدادات Vercel' });
  }
  
  const messages = [];
  if (history && history.length > 0) {
    history.forEach(msg => {
      messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.text });
    });
  }

  let systemPrompt = "";
  if (dataContext) {
    systemPrompt = `
      أنت المساعد الذكي لنظام "FT" داخل لوحة تحكم العميل. 
      أنت خبير في تحليل البيانات وإدارة المتاجر والديون.
      تجيب على أسئلة العميل بلهجته وبنفس لغته، وتكون دقيقاً جداً في الأرقام.
      
      ⚠️ هام جداً: هذه هي البيانات الحالية الحقيقية للعميل:
      ${dataContext}
      
      بناءً على هذه البيانات، أجب على سؤال العميل بدقة. لا تخترع أرقاماً من عندك.
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

  messages.unshift({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: message });

  try {
    const fetchPromise = fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: 'qwen/qwen-2.5-7b-instruct:free',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('API Timeout')), 15000)
    );

    const response = await Promise.race([fetchPromise, timeoutPromise]);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'خطأ من OpenRouter API');
    }
    
    const aiResponse = data.choices[0].message.content;
    return res.status(200).json({ reply: aiResponse });
    
  } catch (error) {
    if (error.message === 'API Timeout') {
       return res.status(500).json({ error: 'تأخر الرد من الخادم. يرجى المحاولة مرة أخرى.' });
    }
    return res.status(500).json({ error: 'حدث خطأ: ' + error.message });
  }
}
