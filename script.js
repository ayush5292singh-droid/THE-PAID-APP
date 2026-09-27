const DB_KEY = "FINOVA_ADVANCED_V1";

let db = JSON.parse(localStorage.getItem(DB_KEY) || "null");

if (!db) {
    db = {
        transactions: [],
        wallets: [
            {
                id: crypto.randomUUID(),
                name: "Main Wallet",
                type: "Cash",
                opening: 0
            }
        ],
        budgets: [],
        loans: [],
        goals: [],
        recurring: [],
        settings: {
            currency: "₹",
            theme: "dark",
            name: "FINOVA User"
        },
        pro: false
    };
}

let currentTransactionType = "expense";
let expenseChart = null;
let categoryChart = null;
let incomeExpenseChart = null;

function saveDB(){
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function money(value){
    return "₹" + Number(value || 0).toLocaleString("en-IN",{
        maximumFractionDigits:2
    });
}

function showToast(message){
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(()=>{
        toast.classList.remove("show");
    },2500);
}

function showPage(page){

    document.querySelectorAll(".page").forEach(p=>{
        p.classList.remove("active");
    });

    const target = document.getElementById(page);

    if(target){
        target.classList.add("active");
    }

    if(page === "dashboard") renderDashboard();
    if(page === "transactions") renderTransactions();
    if(page === "wallets") renderWallets();
    if(page === "budgets") renderBudgets();
    if(page === "loans") renderLoans();
    if(page === "analytics") renderAnalytics();
    if(page === "goals") renderGoals();
    if(page === "recurring") renderRecurring();
}

function toggleTheme(){

    document.body.classList.toggle("light");

    db.settings.theme =
        document.body.classList.contains("light")
        ? "light"
        : "dark";

    saveDB();
}

function applyTheme(){

    if(db.settings.theme === "light"){
        document.body.classList.add("light");
    }else{
        document.body.classList.remove("light");
    }
}


/* =========================
   TRANSACTIONS
========================= */

function openTransaction(type = "expense"){

    currentTransactionType = type;

    document.getElementById("transactionAmount").value = "";
    document.getElementById("transactionNote").value = "";

    fillWalletSelect();

    setTransactionType(type);

    document.getElementById("transactionModal").classList.add("show");
}

function closeModal(id){
    document.getElementById(id).classList.remove("show");
}

function setTransactionType(type){

    currentTransactionType = type;

    document.getElementById("expenseTab")
        .classList.toggle("active",type === "expense");

    document.getElementById("incomeTab")
        .classList.toggle("active",type === "income");
}

function fillWalletSelect(){

    const select = document.getElementById("transactionWallet");

    select.innerHTML = "";

    db.wallets.forEach(wallet=>{
        const option = document.createElement("option");
        option.value = wallet.id;
        option.textContent = wallet.name;
        select.appendChild(option);
    });
}

function saveTransaction(){

    const amount = Number(
        document.getElementById("transactionAmount").value
    );

    if(!amount || amount <= 0){
        showToast("Enter a valid amount.");
        return;
    }

    const category =
        document.getElementById("transactionCategory").value;

    const note =
        document.getElementById("transactionNote").value.trim();

    const wallet =
        document.getElementById("transactionWallet").value;

    db.transactions.unshift({
        id: crypto.randomUUID(),
        type: currentTransactionType,
        amount,
        category,
        note,
        wallet,
        date: new Date().toISOString()
    });

    saveDB();

    closeModal("transactionModal");

    renderAll();

    showToast("Transaction added successfully.");
}

function renderTransactions(){

    const list = document.getElementById("transactionList");

    if(!list) return;

    const search =
        document.getElementById("searchTransaction")?.value
        .toLowerCase() || "";

    const filter =
        document.getElementById("transactionFilter")?.value || "all";

    let data = db.transactions.filter(t=>{

        const matchesSearch =
            `${t.category} ${t.note}`
            .toLowerCase()
            .includes(search);

        const matchesFilter =
            filter === "all" || t.type === filter;

        return matchesSearch && matchesFilter;
    });

    if(!data.length){
        list.innerHTML =
            `<p class="muted">No transactions found.</p>`;
        return;
    }

    list.innerHTML = data.map(t=>{

        const sign = t.type === "income" ? "+" : "-";

        const icon = {
            Food:"🍔",
            Transport:"🚗",
            Shopping:"🛍️",
            Bills:"📄",
            Entertainment:"🎮",
            Health:"❤️",
            Education:"📚",
            Rent:"🏠",
            Salary:"💼",
            Investment:"📈",
            Travel:"✈️",
            Other:"💰"
        }[t.category] || "💰";

        return `
        <div class="transaction">

            <div class="transaction-left">

                <div class="transaction-icon">${icon}</div>

                <div>
                    <div class="transaction-name">
                        ${escapeHTML(t.note || t.category)}
                    </div>

                    <div class="transaction-meta">
                        ${t.category} • ${formatDate(t.date)}
                    </div>
                </div>

            </div>

            <strong class="${t.type}">
                ${sign}${money(t.amount)}
            </strong>

        </div>`;
    }).join("");
}

function formatDate(date){

    return new Date(date).toLocaleDateString("en-IN",{
        day:"numeric",
        month:"short",
        year:"numeric"
    });
}


/* =========================
   DASHBOARD
========================= */

function getIncome(){

    return db.transactions
        .filter(t=>t.type==="income")
        .reduce((sum,t)=>sum+t.amount,0);
}

function getExpenses(){

    return db.transactions
        .filter(t=>t.type==="expense")
        .reduce((sum,t)=>sum+t.amount,0);
}

function getLoanBalance(){

    return db.loans.reduce((sum,l)=>sum+l.remaining,0);
}

function renderDashboard(){

    const income = getIncome();
    const expenses = getExpenses();
    const balance = income - expenses;
    const loan = getLoanBalance();

    document.getElementById("dashIncome").textContent = money(income);
    document.getElementById("dashExpense").textContent = money(expenses);
    document.getElementById("dashBalance").textContent = money(balance);
    document.getElementById("dashLoan").textContent = money(loan);
    document.getElementById("netWorth").textContent =
        money(balance - loan);

    renderRecentTransactions();
    renderExpenseChart();
    calculateHealth();
}

function renderRecentTransactions(){

    const box = document.getElementById("recentTransactions");

    if(!box) return;

    const data = db.transactions.slice(0,5);

    if(!data.length){
        box.innerHTML =
            `<p class="muted">No transactions yet.</p>`;
        return;
    }

    box.innerHTML = data.map(t=>{

        const sign = t.type === "income" ? "+" : "-";

        return `
        <div class="transaction">
            <div>
                <div class="transaction-name">
                    ${escapeHTML(t.note || t.category)}
                </div>
                <div class="transaction-meta">
                    ${t.category}
                </div>
            </div>

            <strong class="${t.type}">
                ${sign}${money(t.amount)}
            </strong>
        </div>`;
    }).join("");
}

function calculateHealth(){

    const income = getIncome();
    const expense = getExpenses();

    let score = 0;

    if(income > 0){
        const savings = Math.max(0, income-expense);
        const rate = savings/income;

        score = Math.min(100,Math.round(rate*100)+30);

        if(expense > income){
            score = 15;
        }
    }

    document.getElementById("healthScore").textContent =
        score + "%";

    document.getElementById("healthBar").style.width =
        score + "%";

    document.getElementById("healthText").textContent =
        score >= 70
        ? "Your current income/expense pattern shows strong savings."
        : score >= 40
        ? "There is room to improve your savings."
        : "Track more transactions to understand your financial position.";
}


/* =========================
   CHARTS
========================= */

function renderExpenseChart(){

    const ctx =
        document.getElementById("expenseChart");

    if(!ctx) return;

    const categories = {};

    db.transactions
        .filter(t=>t.type==="expense")
        .forEach(t=>{
            categories[t.category] =
                (categories[t.category] || 0) + t.amount;
        });

    if(expenseChart){
        expenseChart.destroy();
    }

    expenseChart = new Chart(ctx,{
        type:"doughnut",
        data:{
            labels:Object.keys(categories),
            datasets:[{
                data:Object.values(categories)
            }]
        },
        options:{
            responsive:true,
            plugins:{
                legend:{
                    labels:{
                        color:getComputedStyle(document.body)
                            .getPropertyValue("--text")
                    }
                }
            }
        }
    });
}

function renderAnalytics(){

    const income = getIncome();
    const expenses = getExpenses();

    const rate =
        income > 0
        ? Math.max(0,((income-expenses)/income)*100)
        : 0;

    document.getElementById("savingsRate").textContent =
        Math.round(rate) + "%";

    document.getElementById("transactionCount").textContent =
        db.transactions.length;

    const categories = {};

    db.transactions
        .filter(t=>t.type==="expense")
        .forEach(t=>{
            categories[t.category] =
                (categories[t.category] || 0)+t.amount;
        });

    const top =
        Object.entries(categories)
        .sort((a,b)=>b[1]-a[1])[0];

    document.getElementById("topCategory").textContent =
        top ? top[0] : "—";

    document.getElementById("loanBalance").textContent =
        money(getLoanBalance());

    renderCategoryChart(categories);
    renderIncomeExpenseChart(income,expenses);
}

function renderCategoryChart(categories){

    const ctx = document.getElementById("categoryChart");

    if(categoryChart){
        categoryChart.destroy();
    }

    categoryChart = new Chart(ctx,{
        type:"bar",
        data:{
            labels:Object.keys(categories),
            datasets:[{
                label:"Spending",
                data:Object.values(categories)
            }]
        },
        options:{
            responsive:true
        }
    });
}

function renderIncomeExpenseChart(income,expense){

    const ctx =
        document.getElementById("incomeExpenseChart");

    if(incomeExpenseChart){
        incomeExpenseChart.destroy();
    }

    incomeExpenseChart = new Chart(ctx,{
        type:"bar",
        data:{
            labels:["Income","Expenses"],
            datasets:[{
                label:"Amount",
                data:[income,expense]
            }]
        },
        options:{
            responsive:true
        }
    });
}


/* =========================
   WALLETS
========================= */

function getWalletBalance(id){

    const wallet =
        db.wallets.find(w=>w.id===id);

    if(!wallet) return 0;

    let balance = Number(wallet.opening || 0);

    db.transactions.forEach(t=>{

        if(t.wallet !== id) return;

        if(t.type==="income"){
            balance += t.amount;
        }else{
            balance -= t.amount;
        }
    });

    return balance;
}

function addWallet(){

    const name = prompt("Wallet name:");

    if(!name) return;

    const type =
        prompt("Type: Cash / Bank / Card","Cash");

    db.wallets.push({
        id:crypto.randomUUID(),
        name,
        type:type || "Cash",
        opening:0
    });

    saveDB();
    renderWallets();

    showToast("Wallet created.");
}

function renderWallets(){

    const box =
        document.getElementById("walletList");

    if(!box) return;

    box.innerHTML = db.wallets.map(w=>`
        <div class="wallet">

            <h3>${escapeHTML(w.name)}</h3>

            <p class="small">${escapeHTML(w.type)}</p>

            <div class="balance">
                ${money(getWalletBalance(w.id))}
            </div>

        </div>
    `).join("");
}


/* =========================
   BUDGETS
========================= */

function addBudget(){

    const category =
        prompt("Category:");

    if(!category) return;

    const amount =
        Number(prompt("Monthly budget amount:"));

    if(!amount || amount<=0) return;

    db.budgets.push({
        id:crypto.randomUUID(),
        category,
        amount
    });

    saveDB();
    renderBudgets();

    showToast("Budget created.");
}

function renderBudgets(){

    const box =
        document.getElementById("budgetList");

    if(!box) return;

    if(!db.budgets.length){
        box.innerHTML =
            `<div class="panel"><p class="muted">No budgets yet.</p></div>`;
        return;
    }

    box.innerHTML = db.budgets.map(b=>{

        const spent =
            db.transactions
            .filter(t=>
                t.type==="expense" &&
                t.category.toLowerCase() ===
                b.category.toLowerCase()
            )
            .reduce((s,t)=>s+t.amount,0);

        const percentage =
            Math.min(100,Math.round((spent/b.amount)*100));

        return `
        <div class="budget">

            <div class="budget-head">
                <div>
                    <h3>${escapeHTML(b.category)}</h3>
                    <span class="small">
                        ${money(spent)} / ${money(b.amount)}
                    </span>
                </div>

                <strong>${percentage}%</strong>
            </div>

            <div class="progress">
                <div style="width:${percentage}%"></div>
            </div>

        </div>`;
    }).join("");
}


/* =========================
   LOANS
========================= */

function calculateEMIValue(principal,rate,months){

    if(!principal || !months) return 0;

    const monthlyRate =
        rate / 12 / 100;

    if(monthlyRate === 0){
        return principal/months;
    }

    return principal *
        monthlyRate *
        Math.pow(1+monthlyRate,months) /
        (Math.pow(1+monthlyRate,months)-1);
}

function calculateEMI(){

    const principal =
        Number(document.getElementById("calcPrincipal").value);

    const rate =
        Number(document.getElementById("calcRate").value);

    const months =
        Number(document.getElementById("calcMonths").value);

    const emi =
        calculateEMIValue(principal,rate,months);

    if(!emi){
        document.getElementById("emiResult").textContent =
            "Enter valid loan details.";
        return;
    }

    const total =
        emi*months;

    const interest =
        total-principal;

    document.getElementById("emiResult").innerHTML = `
        <b>Monthly EMI: ${money(emi)}</b><br>
        Total Interest: ${money(interest)}<br>
        Total Payment: ${money(total)}
    `;
}

function openLoanForm(){

    document.getElementById("loanName").value="";
    document.getElementById("loanPrincipal").value="";
    document.getElementById("loanRate").value="";
    document.getElementById("loanMonths").value="";

    document.getElementById("loanModal")
        .classList.add("show");
}

function saveLoan(){

    const name =
        document.getElementById("loanName").value.trim();

    const principal =
        Number(document.getElementById("loanPrincipal").value);

    const rate =
        Number(document.getElementById("loanRate").value);

    const months =
        Number(document.getElementById("loanMonths").value);

    if(!name || !principal || !months){
        showToast("Fill all required loan details.");
        return;
    }

    const emi =
        calculateEMIValue(principal,rate,months);

    db.loans.push({
        id:crypto.randomUUID(),
        name,
        principal,
        rate,
        months,
        emi,
        paid:0,
        paidEMIs:0,
        remaining:principal,
        payments:[]
    });

    saveDB();

    closeModal("loanModal");
    renderLoans();

    showToast("Loan created.");
}

function renderLoans(){

    const box =
        document.getElementById("loanList");

    if(!box) return;

    if(!db.loans.length){
        box.innerHTML =
            `<div class="panel"><p class="muted">No loans added.</p></div>`;
        return;
    }

    box.innerHTML = db.loans.map(l=>{

        const progress =
            l.principal > 0
            ? Math.min(100,Math.round(
                ((l.principal-l.remaining)/l.principal)*100
            ))
            : 0;

        return `
        <div class="loan">

            <div class="loan-head">
                <div>
                    <h2>${escapeHTML(l.name)}</h2>
                    <p class="small">
                        EMI ${money(l.emi)}
                    </p>
                </div>

                <strong>${progress}% paid</strong>
            </div>

            <div class="progress">
                <div style="width:${progress}%"></div>
            </div>

            <div class="cards">

                <div class="card">
                    <span>Original</span>
                    <strong>${money(l.principal)}</strong>
                </div>

                <div class="card">
                    <span>Remaining</span>
                    <strong>${money(l.remaining)}</strong>
                </div>

                <div class="card">
                    <span>EMIs Paid</span>
                    <strong>${l.paidEMIs}</strong>
                </div>

            </div>

            <div class="loan-actions">

                <button class="primary"
                    onclick="payEMI('${l.id}')">
                    💳 Pay EMI
                </button>

                <button
                    onclick="showLoanHistory('${l.id}')">
                    📋 Payment History
                </button>

                <button
                    onclick="deleteLoan('${l.id}')">
                    Delete
                </button>

            </div>

        </div>`;
    }).join("");
}

function payEMI(id){

    const loan =
        db.loans.find(l=>l.id===id);

    if(!loan) return;

    if(loan.remaining <= 0){
        showToast("This loan is already completed.");
        return;
    }

    const payment =
        Math.min(loan.emi,loan.remaining);

    loan.remaining -= payment;
    loan.paid += payment;
    loan.paidEMIs++;

    loan.payments.unshift({
        id:crypto.randomUUID(),
        amount:payment,
        date:new Date().toISOString()
    });

    saveDB();
    renderLoans();
    renderDashboard();

    showToast(
        `EMI payment recorded: ${money(payment)}`
    );
}

function showLoanHistory(id){

    const loan =
        db.loans.find(l=>l.id===id);

    if(!loan) return;

    if(!loan.payments.length){
        alert("No EMI payments yet.");
        return;
    }

    alert(
        loan.payments.map((p,i)=>
            `${i+1}. ${money(p.amount)} — ${formatDate(p.date)}`
        ).join("\n")
    );
}

function deleteLoan(id){

    if(!confirm("Delete this loan?")) return;

    db.loans =
        db.loans.filter(l=>l.id!==id);

    saveDB();
    renderLoans();
    renderDashboard();

    showToast("Loan deleted.");
}


/* =========================
   RECEIPT OCR
========================= */

async function scanReceipt(event){

    const file =
        event.target.files[0];

    if(!file) return;

    const preview =
        document.getElementById("receiptPreview");

    preview.src =
        URL.createObjectURL(file);

    preview.style.display="block";

    const status =
        document.getElementById("scanStatus");

    status.innerHTML =
        `<p class="muted">🔍 Reading receipt...</p>`;

    try{

        const result =
            await Tesseract.recognize(
                file,
                "eng",
                {
                    logger:m=>{
                        if(m.status === "recognizing text"){
                            status.innerHTML =
                                `<p class="muted">
                                    OCR ${Math.round(m.progress*100)}%
                                </p>`;
                        }
                    }
                }
            );

        const text =
            result.data.text;

        analyzeReceiptText(text);

        status.innerHTML =
            `<p class="income">✓ Receipt scanned. Check the detected fields.</p>`;

    }catch(error){

        console.error(error);

        status.innerHTML =
            `<p class="expense">
                Scanner failed. Enter the details manually.
            </p>`;
    }
}

function analyzeReceiptText(text){

    const cleaned =
        text.replace(/,/g,"");

    const matches =
        cleaned.match(
            /(?:₹|rs\.?|inr)?\s?(\d+(?:\.\d{1,2})?)/gi
        );

    let amounts = [];

    if(matches){

        amounts =
            matches.map(x=>{

                const m =
                    x.match(/\d+(?:\.\d{1,2})?/);

                return m ? Number(m[0]) : 0;

            }).filter(x=>x>0);
    }

    if(amounts.length){

        const amount =
            Math.max(...amounts);

        document.getElementById("scanAmount").value =
            amount;
    }

    const lower =
        text.toLowerCase();

    let category = "Other";

    if(/restaurant|food|cafe|pizza|burger|grocery|mart/.test(lower)){
        category="Food";
    }
    else if(/uber|ola|metro|fuel|petrol|diesel|transport/.test(lower)){
        category="Transport";
    }
    else if(/amazon|flipkart|mall|shopping|store/.test(lower)){
        category="Shopping";
    }
    else if(/electricity|water|internet|mobile|bill/.test(lower)){
        category="Bills";
    }
    else if(/hospital|pharmacy|medical|clinic/.test(lower)){
        category="Health";
    }
    else if(/school|college|book|education/.test(lower)){
        category="Education";
    }
    else if(/hotel|flight|travel|airbnb/.test(lower)){
        category="Travel";
    }

    document.getElementById("scanCategory").value =
        category;

    const lines =
        text.split("\n")
        .map(x=>x.trim())
        .filter(x=>x.length>2);

    const merchant =
        lines.find(x=>
            !/\d/.test(x) &&
            x.length < 45
        );

    if(merchant){
        document.getElementById("scanMerchant").value =
            merchant;
    }
}

function addScannedExpense(){

    const amount =
        Number(document.getElementById("scanAmount").value);

    if(!amount || amount<=0){
        showToast("Enter/check the detected amount.");
        return;
    }

    const category =
        document.getElementById("scanCategory").value;

    const merchant =
        document.getElementById("scanMerchant").value ||
        "Receipt Expense";

    const wallet =
        db.wallets[0]?.id;

    db.transactions.unshift({
        id:crypto.randomUUID(),
        type:"expense",
        amount,
        category,
        note:merchant,
        wallet,
        date:new Date().toISOString(),
        source:"receipt"
    });

    saveDB();

    document.getElementById("scanAmount").value="";
    document.getElementById("scanMerchant").value="";

    renderAll();

    showToast("Receipt expense added.");
}


/* =========================
   GOALS
========================= */

function addGoal(){

    const name =
        prompt("Goal name:");

    if(!name) return;

    const target =
        Number(prompt("Target amount:"));

    if(!target || target<=0) return;

    db.goals.push({
        id:crypto.randomUUID(),
        name,
        target,
        saved:0
    });

    saveDB();
    renderGoals();

    showToast("Goal created.");
}

function renderGoals(){

    const box =
        document.getElementById("goalList");

    if(!box) return;

    if(!db.goals.length){
        box.innerHTML =
            `<div class="panel"><p class="muted">No savings goals.</p></div>`;
        return;
    }

    box.innerHTML =
        db.goals.map(g=>{

            const percent =
                Math.min(100,Math.round(
                    g.saved/g.target*100
                ));

            return `
            <div class="goal">

                <div class="goal-head">

                    <div>
                        <h3>${escapeHTML(g.name)}</h3>
                        <p class="small">
                            ${money(g.saved)} / ${money(g.target)}
                        </p>
                    </div>

                    <strong>${percent}%</strong>

                </div>

                <div class="progress">
                    <div style="width:${percent}%"></div>
                </div>

                <button onclick="addGoalMoney('${g.id}')">
                    + Add Savings
                </button>

            </div>`;
        }).join("");
}

function addGoalMoney(id){

    const goal =
        db.goals.find(g=>g.id===id);

    if(!goal) return;

    const amount =
        Number(prompt("Amount to add:"));

    if(!amount || amount<=0) return;

    goal.saved =
        Math.min(goal.target,goal.saved+amount);

    saveDB();
    renderGoals();

    showToast("Savings updated.");
}


/* =========================
   RECURRING
========================= */

function addRecurring(){

    const name =
        prompt("Payment name:");

    if(!name) return;

    const amount =
        Number(prompt("Amount:"));

    if(!amount || amount<=0) return;

    const day =
        Number(prompt("Day of month (1-28):","1"));

    db.recurring.push({
        id:crypto.randomUUID(),
        name,
        amount,
        day:Math.max(1,Math.min(28,day||1))
    });

    saveDB();
    renderRecurring();

    showToast("Recurring payment added.");
}

function renderRecurring(){

    const box =
        document.getElementById("recurringList");

    if(!box) return;

    if(!db.recurring.length){
        box.innerHTML =
            `<div class="panel"><p class="muted">No recurring payments.</p></div>`;
        return;
    }

    box.innerHTML =
        db.recurring.map(r=>`
        <div class="panel">

            <div class="panel-title">

                <div>
                    <h3>${escapeHTML(r.name)}</h3>
                    <p class="small">
                        Due on day ${r.day} every month
                    </p>
                </div>

                <strong>${money(r.amount)}</strong>

            </div>

        </div>
        `).join("");
}


/* =========================
   CALCULATORS
========================= */

let calculatorType = "compound";

function openCalculator(type){

    calculatorType = type;

    document.getElementById("calculatorTitle").textContent =
        type === "compound"
        ? "Compound Interest"
        : "Simple Interest";

    document.getElementById("calculatorResult").textContent="";

    document.getElementById("calculatorModal")
        .classList.add("show");
}

function runCalculator(){

    const p =
        Number(document.getElementById("ciPrincipal").value);

    const r =
        Number(document.getElementById("ciRate").value);

    const t =
        Number(document.getElementById("ciTime").value);

    if(!p || !r || !t){
        showToast("Enter all values.");
        return;
    }

    let total;

    if(calculatorType === "compound"){
        total =
            p * Math.pow(1+r/100,t);
    }else{
        total =
            p + (p*r*t/100);
    }

    const interest =
        total-p;

    document.getElementById("calculatorResult").innerHTML =
        `<b>Total: ${money(total)}</b><br>
         Interest: ${money(interest)}`;
}


/* =========================
   BACKUP / RESTORE
========================= */

function backupData(){

    const blob =
        new Blob(
            [JSON.stringify(db,null,2)],
            {type:"application/json"}
        );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href=url;
    a.download="FINOVA-backup.json";
    a.click();

    URL.revokeObjectURL(url);

    showToast("Backup downloaded.");
}

function restoreData(){

    const input =
        document.createElement("input");

    input.type="file";
    input.accept=".json";

    input.onchange = event=>{

        const file =
            event.target.files[0];

        if(!file) return;

        const reader =
            new FileReader();

        reader.onload = e=>{

            try{

                const restored =
                    JSON.parse(e.target.result);

                if(
                    !restored.transactions ||
                    !restored.wallets
                ){
                    throw new Error("Invalid backup");
                }

                db=restored;

                saveDB();
                renderAll();

                showToast("Backup restored.");

            }catch(error){

                showToast("Invalid FINOVA backup.");
            }
        };

        reader.readAsText(file);
    };

    input.click();
}

function resetData(){

    if(!confirm(
        "Delete all FINOVA data? This cannot be undone."
    )){
        return;
    }

    localStorage.removeItem(DB_KEY);
    location.reload();
}


/* =========================
   UTILITIES
========================= */

function escapeHTML(value){

    return String(value || "")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
}

function renderAll(){

    renderDashboard();
    renderTransactions();
    renderWallets();
    renderBudgets();
    renderLoans();
    renderGoals();
    renderRecurring();
    renderAnalytics();
}

applyTheme();
renderAll();
