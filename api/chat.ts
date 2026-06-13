import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Local fallback NLP parser
function tryLocalParseAndQuery(
  message: string,
  transactions: any[] = [],
  accounts: any[] = [],
  categories: any[] = [],
  locale: string = "en"
) {
  const cleanMsg = message.replace(/,/g, "");
  const text = cleanMsg.toLowerCase().trim();
  const todayDateStr = new Date().toISOString().split("T")[0];

  const matchedNumbers: number[] = [];
  const numRegex = /(?:rs\.?|₹|inr|rupees?|ரூபாய்)?\s*(\d+(?:\.\d{1,2})?)/gi;
  let match;
  while ((match = numRegex.exec(cleanMsg)) !== null) {
    const val = parseFloat(match[1]);
    if (!isNaN(val) && val > 0) {
      matchedNumbers.push(val);
    }
  }

  const isGreeting =
    text.includes("hello") ||
    text.includes("hi") ||
    text.includes("hey") ||
    text.includes("vanakkam") ||
    text.includes("வணக்கம்") ||
    text.includes("hola") ||
    text.includes("greetings");

  const isQuery =
    text.includes("how much") ||
    text.includes("balance") ||
    text.includes("total") ||
    text.includes("what is my") ||
    text.includes("செலவு") ||
    text.includes("மீதி") ||
    text.includes("எவ்வளவு") ||
    text.includes("வருமானம்") ||
    text.includes("இறுதி") ||
    text.includes("இருப்பு") ||
    text.includes("summary") ||
    text.includes("report") ||
    text.includes("logs") ||
    text.includes("list");

  if (isQuery) {
    let answerText = "";
    if (locale === "ta") {
      answerText = "🤖 **உள்ளூர் நிதி அறிக்கை (Fallback Mode):**\n\n";
    } else {
      answerText = "🤖 **Local Offline Assistant:**\n\n";
    }

    if (text.includes("balance") || text.includes("மீதி") || text.includes("இருப்பு")) {
      const activeAccounts = accounts && accounts.length > 0 ? accounts : [
        { name: "Cash", balance: 5000 },
        { name: "Bank A/C", balance: 45000 }
      ];
      const totalBalance = activeAccounts.reduce((sum, a) => sum + a.balance, 0);
      const breakdown = activeAccounts.map((a) => `${a.name}: ₹${a.balance.toLocaleString()}`).join(", ");
      
      if (locale === "ta") {
        answerText += `உங்களுடைய மொத்த கணக்கு இருப்பு ₹${totalBalance.toLocaleString()} ஆகும்.\nவிபரம்: ${breakdown}.`;
      } else {
        answerText += `Your current total estimated balance is ₹${totalBalance.toLocaleString()}.\nBreakdown: ${breakdown}.`;
      }
    }
    else if (text.includes("spent") || text.includes("spend") || text.includes("selavu") || text.includes("செலவு")) {
      const activeTx = transactions || [];
      const expenseList = activeTx.filter((t) => t.type === "expense");
      const totalExp = expenseList.reduce((sum, t) => sum + t.amount, 0);

      let matchedCat = "";
      let catSum = 0;
      for (const cat of (categories || [])) {
        if (text.includes(cat.name.toLowerCase())) {
          matchedCat = cat.name;
          catSum = expenseList
            .filter((t) => t.category.toLowerCase() === cat.name.toLowerCase())
            .reduce((sum, t) => sum + t.amount, 0);
          break;
        }
      }

      if (matchedCat) {
        if (locale === "ta") {
          answerText += `'${matchedCat}' பிரிவில் நீங்கள் செய்த மொத்த செலவு ₹${catSum.toLocaleString()} ஆகும்.`;
        } else {
          answerText += `You have spent an estimated ₹${catSum.toLocaleString()} on '${matchedCat}' in your recorded history.`;
        }
      } else {
        if (locale === "ta") {
          answerText += `திட்டமிடப்பட்ட மொத்த செலவுகள்: ₹${totalExp.toLocaleString()} (மொத்தம் ${expenseList.length} பதிவுகள்).`;
        } else {
          answerText += `You have spent a total of ₹${totalExp.toLocaleString()} across ${expenseList.length} expense logs.`;
        }
      }
    }
    else {
      const activeTx = transactions || [];
      const totalInc = activeTx.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const totalExp = activeTx.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
      
      if (locale === "ta") {
        answerText += `மாதாந்திர நிதி நிலவரம்:\n• மொத்த வரவு: ₹${totalInc.toLocaleString()}\n• மொத்த செலவு: ₹${totalExp.toLocaleString()}\n• நிகர சேமிப்பு: ₹${(totalInc - totalExp).toLocaleString()}`;
      } else {
        answerText += `Your general ledger report:\n• Total Inflow: ₹${totalInc.toLocaleString()}\n• Total Outflow: ₹${totalExp.toLocaleString()}\n• Net Savings: ₹${(totalInc - totalExp).toLocaleString()}`;
      }
    }

    return {
      action: "query",
      answerText,
    };
  }

  if (matchedNumbers.length > 0) {
    const amountFloat = matchedNumbers[0];
    
    let type: "income" | "expense" | "transfer" = "expense";
    if (
      text.includes("received") ||
      text.includes("earned") ||
      text.includes("salary") ||
      text.includes("income") ||
      text.includes("bonus") ||
      text.includes("allowance") ||
      text.includes("credited") ||
      text.includes("கிடைத்தது") ||
      text.includes("வந்தது") ||
      text.includes("வருமானம்") ||
      text.includes("வரவு")
    ) {
      type = "income";
    } else if (
      text.includes("transfer") ||
      text.includes("sent") ||
      text.includes("moved") ||
      text.includes("shift") ||
      text.includes("மாற்றினேன்") ||
      text.includes("மாற்றவும்") ||
      text.includes("அனுப்பினேன்")
    ) {
      type = "transfer";
    }

    let foundCategory = type === "income" ? "Salary" : "Food";
    const availableCategories = (categories && categories.length > 0) ? categories : [
      { name: "Food" }, { name: "Fuel" }, { name: "Transport" }, { name: "Snacks & Tea" }, { name: "Salary" }
    ];

    const foodKeywords = ["food", "lunch", "dinner", "cookie", "burger", "pizza", "hotel", "biryani", "சாப்பாடு", "உணவு"];
    const snacksKeywords = ["tea", "coffee", "snack", "biscuit", "water", "டீ", "காபி", "தண்ணீர்", "பலகாரம்"];
    const transportKeywords = ["petrol", "diesel", "fuel", "cab", "taxi", "uber", "bus", "auto", "வண்டி", "பெட்ரோல்", "டீசல்"];
    const householdKeywords = ["rent", "grocery", "groceries", "household", "recharge", "bill", "மின்சாரம்", "வாடகை", "மளிகை"];

    if (foodKeywords.some((kw) => text.includes(kw))) {
      foundCategory = availableCategories.find((c) => c.name.toLowerCase() === "food")?.name || "Food";
    } else if (snacksKeywords.some((kw) => text.includes(kw))) {
      foundCategory = availableCategories.find((c) => c.name.toLowerCase().includes("snacks"))?.name || "Snacks & Tea";
    } else if (transportKeywords.some((kw) => text.includes(kw))) {
      foundCategory = availableCategories.find((c) => c.name.toLowerCase() === "fuel" || c.name.toLowerCase() === "transport")?.name || "Fuel";
    } else if (householdKeywords.some((kw) => text.includes(kw))) {
      foundCategory = availableCategories.find((c) => c.name.toLowerCase() === "household" || c.name.toLowerCase() === "rent")?.name || "Household";
    } else {
      const matchCat = availableCategories.find((c) => text.includes(c.name.toLowerCase()));
      if (matchCat) {
        foundCategory = matchCat.name;
      }
    }

    let foundAccount = "Cash";
    let foundToAccount = "Bank A/C";
    const availableAccounts = (accounts && accounts.length > 0) ? accounts : [
      { name: "Cash" },
      { name: "Bank A/C" },
      { name: "Credit Card" }
    ];

    const bankKeywords = ["bank", "online", "gpay", "debit", "vangi", "வங்கி", "கார்டு"];
    const ccKeywords = ["credit", "cc", "credit card"];
    const cashKeywords = ["cash", "kaiyil", "கைமாற்று", "பணம்"];

    if (ccKeywords.some((kw) => text.includes(kw))) {
      foundAccount = availableAccounts.find((a) => a.name.toLowerCase().includes("credit"))?.name || "Credit Card";
    } else if (bankKeywords.some((kw) => text.includes(kw))) {
      foundAccount = availableAccounts.find((a) => a.name.toLowerCase().includes("bank"))?.name || "Bank A/C";
    } else if (cashKeywords.some((kw) => text.includes(kw))) {
      foundAccount = availableAccounts.find((a) => a.name.toLowerCase().includes("cash"))?.name || "Cash";
    } else {
      const matchAcc = availableAccounts.find((a) => text.includes(a.name.toLowerCase()));
      if (matchAcc) {
        foundAccount = matchAcc.name;
      }
    }

    if (type === "transfer") {
      const sourceIdx = availableAccounts.findIndex((a) => a.name === foundAccount);
      const destAcc = availableAccounts.find((a, idx) => idx !== sourceIdx);
      foundToAccount = destAcc ? destAcc.name : "Bank A/C";
    }

    let note = message;
    if (locale === "ta") {
      note = `மெய்நிகர் பதிவு: ₹${amountFloat} (${foundCategory})`;
    } else {
      note = `Quick Log: ${message}`;
    }

    let answerText = "";
    if (locale === "ta") {
      answerText = `இந்த ₹${amountFloat} தொகையை '${foundCategory}' பிரிவில், '${foundAccount}' கணக்கிலிருந்து இப்படிப் பதிவு செய்யலாமா?`;
    } else {
      answerText = `Can I record ₹${amountFloat} for '${foundCategory}' from '${foundAccount}' like this?`;
    }

    return {
      action: "parse",
      parsedTransaction: {
        type,
        amount: amountFloat,
        category: foundCategory,
        account: foundAccount,
        toAccount: type === "transfer" ? foundToAccount : undefined,
        note,
        date: todayDateStr,
      },
      answerText,
    };
  }

  let answerText = "";
  if (locale === "ta") {
    if (isGreeting) {
      answerText = "வணக்கம்! நான் உங்கள் நிதி உதவியாளர் (Fallback Mode). செலவுகளைப் பதிய 'Spent 200 on petrol' என்று கூறவும், கணக்கு விபரங்களைப் பார்க்க 'What is my balance?' என்று வினவவும்.";
    } else {
      answerText = "மன்னிக்கவும், நான் உங்கள் வாசகத்தைப் புரிந்து கொள்ளவில்லை. 'Spent 150 on Food' போன்ற நேரடித் தரவுகளுடன் பதியவும்.";
    }
  } else {
    if (isGreeting) {
      answerText = "Vanakkam! I'm your Moneysense Assistant (Local Fallback active). Simply state transactions like 'Spent 200 on fuel' or 'received 500' and I will queue it immediately.";
    } else {
      answerText = "Please write a simple financial direction (e.g., 'Spent 150 on tea' or 'how much did I spend this week?'). I'll handle it local offline!";
    }
  }

  return {
    action: "general",
    answerText,
  };
}

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, transactions, accounts, categories, initialBalance, locale = "en" } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const todayDateStr = new Date().toISOString().split('T')[0];

    const accountsContext = accounts ? JSON.stringify(accounts) : "No account data";
    const transactionsContext = transactions ? JSON.stringify(transactions.slice(-30)) : "No recent transactions";
    const categoriesContext = categories ? JSON.stringify(categories) : "Default list";

    const promptText = `
User sentence: "${message}"
Current date today: ${todayDateStr}

We have a personal finance manager. Help us process this sentence.
Choose one of three action types:
1. "parse": If the user is trying to add, record, log, or notify a new transaction (income, expense, or transfer).
2. "query": If the user is asking a financial question about their logs, spending history, balances, etc.
3. "general": If it is a generic greeting, conversational prompt, or doesn't fit the above.

Current Categories Configured:
${categoriesContext}

Current Accounts:
${accountsContext}

Recent Transactions logs (last 30 items):
${transactionsContext}

INSTRUCTIONS:
- We support English, Tamil ("இன்று 250 ரூபாய் செலவிட்டேன்"), and Tanglish ("inniku 250 rs food-nu selavu pannen").
- Extract the transaction fields accurately if action is "parse".
  - If the user says "spent" / "செலவு" -> type is "expense".
  - If "received" / "salary" / "income" / "கிடைத்தது" / "வருமானம்" -> type is "income".
  - If "transfer" / "மாற்றினேன்" -> type is "transfer".
  - Match to one of the configured categories. E.g., petrol/diesel -> "Fuel" or "Transport", lunch/Zomato/tea/biscuit -> "Food" or "Snacks & Tea", salary -> "Salary", etc.
  - Match to one of the configured accounts (e.g., Cash or Bank). If not defined, fallback to Cash.
  - Default the date to ${todayDateStr} if not specified ("today"). If "yesterday" or "நேற்று" set to previous day's date.
- If action is "query", calculate the answer based on the transaction logs provided. Provide a clear and helpful explanation. Answer in Tamil if the user spoke in Tamil, or English if they spoke in English.
- If action is "general", provide a polite assistant response.
`;

    console.log("📤 Sending to Gemini AI...");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["action", "answerText"],
          properties: {
            action: {
              type: Type.STRING,
              description: "The identified action type: parse, query, or general",
            },
            answerText: {
              type: Type.STRING,
              description: "The formatted assistant response. Must be in Tamil if input was Tamil, or Tanglish if Tanglish, otherwise English.",
            },
            parsedTransaction: {
              type: Type.OBJECT,
              required: ["type", "amount", "category", "account", "date"],
              properties: {
                type: { type: Type.STRING, description: "Must be 'income', 'expense', or 'transfer'" },
                amount: { type: Type.NUMBER, description: "Numeric amount of the transaction, e.g. 150" },
                category: { type: Type.STRING, description: "Matching category name from configured list" },
                account: { type: Type.STRING, description: "Matching account name from configured list" },
                toAccount: { type: Type.STRING, description: "Destination account name, required only if type is 'transfer'" },
                note: { type: Type.STRING, description: "Short summary description of the transaction" },
                date: { type: Type.STRING, description: "Date of transaction in YYYY-MM-DD format" }
              }
            }
          }
        }
      }
    });

    const result = response.text;
    const parsedResult = JSON.parse(result);

    console.log("✅ Gemini AI response:", parsedResult);

    res.json(parsedResult);
  } catch (error: any) {
    console.error("❌ Chat error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });

    // Fallback to local parser
    console.log("🔄 Falling back to local parser...");
    const fallbackResult = tryLocalParseAndQuery(
      req.body.message,
      req.body.transactions,
      req.body.accounts,
      req.body.categories,
      req.body.locale
    );

    res.json(fallbackResult);
  }
}
