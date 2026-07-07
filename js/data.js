/* Oakframe Media OS — seed database
   All dates are generated relative to "today" so the workspace always looks live. */
(function () {
  const OM = (window.OM = window.OM || {});

  const DAY = 86400000;
  const now = Date.now();
  const daysAgo = (n, h = 10, m = 0) => { const d = new Date(now - n * DAY); d.setHours(h, m, 0, 0); return d.getTime(); };
  const daysOut = (n, h = 10, m = 0) => { const d = new Date(now + n * DAY); d.setHours(h, m, 0, 0); return d.getTime(); };

  // Deterministic RNG so generated history is stable per seed
  let _s = 42;
  const rnd = () => { _s = (_s * 1103515245 + 12345) % 2147483648; return _s / 2147483648; };
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const between = (a, b) => Math.round(a + rnd() * (b - a));

  /* ============ PEOPLE ============ */
  const users = [
    { id: "u-owner", name: "Marcus Oakes", role: "owner", dept: "Executive", title: "Founder & Owner", email: "marcus@oakframemedia.com", phone: "(512) 555-0100", hireDate: daysAgo(2900), salary: 0, status: "active", online: true },
    { id: "u-ceo", name: "Elena Vasquez", role: "ceo", dept: "Executive", title: "Chief Executive Officer", email: "elena@oakframemedia.com", phone: "(512) 555-0101", hireDate: daysAgo(2500), salary: 245000, status: "active", online: true },
    { id: "u-coo", name: "David Kim", role: "coo", dept: "Executive", title: "Chief Operating Officer", email: "david@oakframemedia.com", phone: "(512) 555-0102", hireDate: daysAgo(2100), salary: 215000, status: "active", online: true },
    { id: "u-cco", name: "Priya Sharma", role: "cco", dept: "Executive", title: "Chief Creative Officer", email: "priya@oakframemedia.com", phone: "(512) 555-0103", hireDate: daysAgo(1900), salary: 205000, status: "active", online: false },
    { id: "u-cso", name: "James Whitfield", role: "cso", dept: "Executive", title: "Chief Sales Officer", email: "james@oakframemedia.com", phone: "(512) 555-0104", hireDate: daysAgo(1750), salary: 198000, status: "active", online: true },
    { id: "u-cfo", name: "Margaret Chen", role: "cfo", dept: "Executive", title: "Chief Financial Officer", email: "margaret@oakframemedia.com", phone: "(512) 555-0105", hireDate: daysAgo(1600), salary: 210000, status: "active", online: false },

    { id: "u-prod-head", name: "Sofia Ramirez", role: "dept_head", dept: "Production", title: "Head of Production", email: "sofia@oakframemedia.com", phone: "(512) 555-0110", hireDate: daysAgo(1500), salary: 142000, status: "active", online: true },
    { id: "u-crea-head", name: "Oliver Bennett", role: "dept_head", dept: "Creative", title: "Creative Director", email: "oliver@oakframemedia.com", phone: "(512) 555-0111", hireDate: daysAgo(1400), salary: 138000, status: "active", online: true },
    { id: "u-sales-head", name: "Tyler Brooks", role: "dept_head", dept: "Sales", title: "Head of Sales", email: "tyler@oakframemedia.com", phone: "(512) 555-0112", hireDate: daysAgo(1300), salary: 128000, status: "active", online: true },
    { id: "u-fin-head", name: "Nina Patel", role: "dept_head", dept: "Finance", title: "Controller", email: "nina@oakframemedia.com", phone: "(512) 555-0113", hireDate: daysAgo(1200), salary: 132000, status: "active", online: false },
    { id: "u-hr-head", name: "Grace Okafor", role: "dept_head", dept: "Human Resources", title: "Head of People", email: "grace@oakframemedia.com", phone: "(512) 555-0114", hireDate: daysAgo(1100), salary: 118000, status: "active", online: true },
    { id: "u-tech-head", name: "Ethan Cole", role: "dept_head", dept: "Technology", title: "Head of Technology", email: "ethan@oakframemedia.com", phone: "(512) 555-0115", hireDate: daysAgo(1000), salary: 145000, status: "active", online: true },
    { id: "u-admin-head", name: "Laura Simmons", role: "dept_head", dept: "Administration", title: "Office Director", email: "laura@oakframemedia.com", phone: "(512) 555-0116", hireDate: daysAgo(950), salary: 96000, status: "active", online: false },

    { id: "u-maya", name: "Maya Johnson", role: "project_lead", dept: "Production", title: "Senior Producer", email: "maya@oakframemedia.com", phone: "(512) 555-0120", hireDate: daysAgo(900), salary: 104000, status: "active", online: true },
    { id: "u-daniel", name: "Daniel Reyes", role: "project_lead", dept: "Creative", title: "Art Director", email: "daniel@oakframemedia.com", phone: "(512) 555-0121", hireDate: daysAgo(850), salary: 98000, status: "active", online: true },
    { id: "u-chris", name: "Chris Turner", role: "senior", dept: "Production", title: "Senior Editor", email: "chris@oakframemedia.com", phone: "(512) 555-0122", hireDate: daysAgo(800), salary: 88000, status: "active", online: true },
    { id: "u-aisha", name: "Aisha Bell", role: "senior", dept: "Creative", title: "Senior Designer", email: "aisha@oakframemedia.com", phone: "(512) 555-0123", hireDate: daysAgo(760), salary: 84000, status: "active", online: false },
    { id: "u-jordan", name: "Jordan Lee", role: "senior", dept: "Sales", title: "Account Executive", email: "jordan@oakframemedia.com", phone: "(512) 555-0124", hireDate: daysAgo(700), salary: 72000, status: "active", online: true },
    { id: "u-rachel", name: "Rachel Torres", role: "senior", dept: "Finance", title: "Senior Accountant", email: "rachel@oakframemedia.com", phone: "(512) 555-0125", hireDate: daysAgo(650), salary: 82000, status: "active", online: true },
    { id: "u-noah", name: "Noah Park", role: "junior", dept: "Production", title: "Production Assistant", email: "noah@oakframemedia.com", phone: "(512) 555-0126", hireDate: daysAgo(400), salary: 52000, status: "active", online: true },
    { id: "u-zoe", name: "Zoe Adams", role: "junior", dept: "Sales", title: "Sales Development Rep", email: "zoe@oakframemedia.com", phone: "(512) 555-0127", hireDate: daysAgo(320), salary: 48000, status: "active", online: true },
    { id: "u-liam", name: "Liam Foster", role: "junior", dept: "Sales", title: "Sales Development Rep", email: "liam@oakframemedia.com", phone: "(512) 555-0128", hireDate: daysAgo(210), salary: 48000, status: "active", online: true },
    { id: "u-emma", name: "Emma Ruiz", role: "junior", dept: "Creative", title: "Junior Designer", email: "emma@oakframemedia.com", phone: "(512) 555-0129", hireDate: daysAgo(180), salary: 54000, status: "active", online: false },
    { id: "u-alex", name: "Alex Morgan", role: "contractor", dept: "Contractors", title: "Drone Operator (Contract)", email: "alex.morgan@contractor.oakframemedia.com", phone: "(512) 555-0130", hireDate: daysAgo(300), salary: 0, rate: 95, status: "active", online: false },
    { id: "u-jade", name: "Jade Nguyen", role: "contractor", dept: "Contractors", title: "Colorist (Contract)", email: "jade.nguyen@contractor.oakframemedia.com", phone: "(512) 555-0131", hireDate: daysAgo(250), salary: 0, rate: 110, status: "active", online: true },
    { id: "u-ben", name: "Ben Carter", role: "intern", dept: "Production", title: "Production Intern", email: "ben@oakframemedia.com", phone: "(512) 555-0132", hireDate: daysAgo(60), salary: 36000, status: "active", online: true },
  ];

  /* ============ CLIENTS ============ */
  const clients = [
    { id: "c-harbor", name: "Harbor & Vine Restaurant Group", industry: "Hospitality", tier: "A", status: "active", since: daysAgo(700), ownerId: "u-jordan", website: "harborandvine.com", city: "Austin, TX", satisfaction: 9.2, notes: "Flagship hospitality account. Quarterly campaign cadence." },
    { id: "c-summit", name: "Summit Peak Outdoor Co.", industry: "Retail / Outdoor", tier: "A", status: "active", since: daysAgo(560), ownerId: "u-tyler2", website: "summitpeak.co", city: "Denver, CO", satisfaction: 8.7, notes: "Seasonal product launches, heavy drone work." },
    { id: "c-bluebird", name: "Bluebird Financial", industry: "Financial Services", tier: "B", status: "active", since: daysAgo(480), ownerId: "u-jordan", website: "bluebirdfin.com", city: "Austin, TX", satisfaction: 8.1, notes: "Compliance review required on all deliverables." },
    { id: "c-nova", name: "Nova Fitness Studios", industry: "Health & Fitness", tier: "B", status: "active", since: daysAgo(420), ownerId: "u-jordan", website: "novafit.com", city: "San Antonio, TX", satisfaction: 9.0, notes: "Monthly social content retainer." },
    { id: "c-beacon", name: "The Beacon Hotel Group", industry: "Hospitality", tier: "A", status: "active", since: daysAgo(380), ownerId: "u-sales-head", website: "beaconhotels.com", city: "Houston, TX", satisfaction: 8.9, notes: "Three properties. Brand refresh underway." },
    { id: "c-crestline", name: "Crestline Real Estate", industry: "Real Estate", tier: "C", status: "active", since: daysAgo(300), ownerId: "u-sales-head", website: "crestlinere.com", city: "Austin, TX", satisfaction: 7.8, notes: "Per-listing video packages." },
    { id: "c-juniper", name: "Juniper & Sage Skincare", industry: "Consumer Goods", tier: "B", status: "active", since: daysAgo(240), ownerId: "u-jordan", website: "juniperandsage.com", city: "Dallas, TX", satisfaction: 9.4, notes: "Studio product photography + UGC-style spots." },
    { id: "c-redline", name: "Redline Motorsports", industry: "Automotive", tier: "C", status: "active", since: daysAgo(150), ownerId: "u-sales-head", website: "redlinemoto.com", city: "Austin, TX", satisfaction: 8.3, notes: "Event coverage. Fast turnarounds." },
    { id: "c-clearwater", name: "Clearwater Dental Partners", industry: "Healthcare", tier: "C", status: "paused", since: daysAgo(500), ownerId: "u-jordan", website: "clearwaterdental.com", city: "Round Rock, TX", satisfaction: 7.2, notes: "Paused pending budget cycle. Re-engage in Q4." },
    { id: "c-atlas", name: "Atlas Logistics", industry: "Logistics", tier: "B", status: "active", since: daysAgo(90), ownerId: "u-jordan", website: "atlaslogistics.io", city: "Fort Worth, TX", satisfaction: 8.5, notes: "New account from Q2 pipeline. Recruiting video series." },
  ];
  // fix owner id typo
  clients.forEach((c) => { if (c.ownerId === "u-tyler2") c.ownerId = "u-sales-head"; });

  const contacts = [
    { id: "ct-1", clientId: "c-harbor", name: "Isabella Moreno", title: "VP Marketing", email: "isabella@harborandvine.com", phone: "(512) 555-2001", primary: true },
    { id: "ct-2", clientId: "c-harbor", name: "Tom Callahan", title: "Brand Manager", email: "tom@harborandvine.com", phone: "(512) 555-2002" },
    { id: "ct-3", clientId: "c-summit", name: "Ryan Holt", title: "CMO", email: "ryan@summitpeak.co", phone: "(720) 555-2003", primary: true },
    { id: "ct-4", clientId: "c-bluebird", name: "Sandra Ellis", title: "Marketing Director", email: "sandra@bluebirdfin.com", phone: "(512) 555-2004", primary: true },
    { id: "ct-5", clientId: "c-nova", name: "Marcus Webb", title: "Founder", email: "marcus@novafit.com", phone: "(210) 555-2005", primary: true },
    { id: "ct-6", clientId: "c-beacon", name: "Diane Fontaine", title: "Group Marketing Lead", email: "diane@beaconhotels.com", phone: "(713) 555-2006", primary: true },
    { id: "ct-7", clientId: "c-crestline", name: "Paul Iverson", title: "Broker / Owner", email: "paul@crestlinere.com", phone: "(512) 555-2007", primary: true },
    { id: "ct-8", clientId: "c-juniper", name: "Hana Sato", title: "Head of Brand", email: "hana@juniperandsage.com", phone: "(214) 555-2008", primary: true },
    { id: "ct-9", clientId: "c-redline", name: "Vince Carter", title: "Events Manager", email: "vince@redlinemoto.com", phone: "(512) 555-2009", primary: true },
    { id: "ct-10", clientId: "c-clearwater", name: "Dr. Amy Liu", title: "Managing Partner", email: "amy@clearwaterdental.com", phone: "(512) 555-2010", primary: true },
    { id: "ct-11", clientId: "c-atlas", name: "Greg Thornton", title: "VP People", email: "greg@atlaslogistics.io", phone: "(817) 555-2011", primary: true },
    { id: "ct-12", clientId: "c-beacon", name: "Carlos Vega", title: "Property GM — Downtown", email: "carlos@beaconhotels.com", phone: "(713) 555-2012" },
  ];

  /* ============ SALES / LEADS ============ */
  const leadDefs = [
    ["Lonestar Brewing Co.", "Craft Beverage", "Kate Dillon", "Marketing Manager", "meeting", 38000, "u-zoe", 3, "Referral"],
    ["Verde Solar", "Energy", "Miguel Santos", "CMO", "proposal", 62000, "u-jordan", 5, "Website"],
    ["Hilltop Church Network", "Non-profit", "Pastor Dave Reed", "Communications Dir.", "contacted", 15000, "u-liam", 2, "Cold Call"],
    ["Pecan Street Coffee", "Hospitality", "Anna Kraus", "Owner", "new", 9000, "u-zoe", 0, "Cold List"],
    ["TitanTech Staffing", "Recruiting", "Rob Muller", "CEO", "negotiating", 54000, "u-sales-head", 12, "Referral"],
    ["Bluewave Pools", "Home Services", "Chad Ferris", "Owner", "interested", 18000, "u-liam", 4, "Cold Call"],
    ["Austin City Ballet", "Arts", "Sylvia Chen", "Development Dir.", "meeting", 27000, "u-jordan", 6, "Event"],
    ["Ranchland Insurance", "Insurance", "Bill Hodges", "Principal", "contacted", 12000, "u-zoe", 1, "Cold List"],
    ["Copperline Apartments", "Real Estate", "Fran Delgado", "Regional Mktg", "proposal", 33000, "u-jordan", 8, "Website"],
    ["Mesa Verde Grill", "Hospitality", "Luis Ortega", "GM", "new", 11000, "u-liam", 0, "Cold List"],
    ["NorthStar Dental", "Healthcare", "Dr. Pete Yang", "Owner", "interested", 16000, "u-zoe", 5, "Cold Call"],
    ["Bighorn Outfitters", "Retail", "Jess Malone", "Ecomm Lead", "won", 45000, "u-sales-head", 20, "Referral"],
    ["Sundown Cinemas", "Entertainment", "Omar Farouk", "Marketing", "lost", 22000, "u-jordan", 15, "Website"],
    ["Kessler & Byrne LLP", "Legal", "Meredith Byrne", "Partner", "contacted", 19000, "u-liam", 3, "Cold Call"],
    ["GreenGate Landscaping", "Home Services", "Tony Russo", "Owner", "new", 8000, "u-zoe", 0, "Cold List"],
    ["Frio River Resorts", "Hospitality", "Dana Pruitt", "Marketing Dir.", "meeting", 41000, "u-sales-head", 7, "Event"],
    ["Circuit Werks", "Automotive", "Sam Petty", "Founder", "interested", 14000, "u-liam", 6, "Cold Call"],
    ["Alamo City Fitness", "Health & Fitness", "Brooke Tanner", "Franchise Mktg", "proposal", 29000, "u-jordan", 9, "Referral"],
    ["Wildflower Weddings", "Events", "Cara Lindqvist", "Owner", "won", 21000, "u-jordan", 25, "Website"],
    ["Ironclad Gyms", "Health & Fitness", "Derek Vaughn", "CEO", "lost", 30000, "u-sales-head", 30, "Cold Call"],
    ["Trellis & Co. Realty", "Real Estate", "Nina Osei", "Team Lead", "new", 13000, "u-liam", 0, "Cold List"],
    ["Caprock Credit Union", "Financial Services", "Hal Emmerich", "VP Marketing", "contacted", 47000, "u-zoe", 2, "Event"],
  ];
  const leads = leadDefs.map((d, i) => ({
    id: "l-" + (i + 1), company: d[0], industry: d[1], contactName: d[2], contactTitle: d[3],
    stage: d[4], value: d[5], assignedTo: d[6], source: d[8],
    email: d[2].toLowerCase().split(" ").pop() + "@" + d[0].toLowerCase().replace(/[^a-z]/g, "").slice(0, 12) + ".com",
    phone: "(512) 555-3" + String(100 + i).slice(-3),
    createdAt: daysAgo(between(10, 90)), lastActivity: d[7] > 0 ? daysAgo(between(0, 6)) : daysAgo(between(3, 12)),
    touches: d[7], priority: d[5] > 35000 ? "high" : d[5] > 15000 ? "medium" : "low",
    notes: "",
  }));

  /* ============ PROJECTS ============ */
  const projects = [
    { id: "p-1", code: "OAK-2401", name: "Harbor & Vine — Summer Menu Campaign", clientId: "c-harbor", status: "active", health: "on_track", leadId: "u-maya", team: ["u-maya", "u-chris", "u-noah", "u-aisha", "u-ben"], startDate: daysAgo(45), dueDate: daysOut(18), budget: 48000, spent: 26800, hoursBudget: 420, progress: 62, service: "Brand Film", clientAccess: true, description: "Hero film + 12 social cutdowns for the summer menu launch across three locations." },
    { id: "p-2", code: "OAK-2402", name: "Summit Peak — Fall Product Launch", clientId: "c-summit", status: "active", health: "at_risk", leadId: "u-maya", team: ["u-maya", "u-alex", "u-chris", "u-jade"], startDate: daysAgo(30), dueDate: daysOut(25), budget: 65000, spent: 41200, hoursBudget: 520, progress: 48, service: "Commercial", clientAccess: true, description: "National spot + drone lifestyle library. Location shoot in Colorado, week 2 weather delay." },
    { id: "p-3", code: "OAK-2403", name: "Beacon Hotels — Brand Refresh Films", clientId: "c-beacon", status: "active", health: "behind", leadId: "u-daniel", team: ["u-daniel", "u-aisha", "u-emma", "u-chris"], startDate: daysAgo(60), dueDate: daysOut(6), budget: 84000, spent: 71500, hoursBudget: 700, progress: 71, service: "Brand Film", clientAccess: true, description: "Property films for three hotels tied to the new identity. Client review cycles running long." },
    { id: "p-4", code: "OAK-2404", name: "Nova Fitness — Monthly Content Retainer", clientId: "c-nova", status: "active", health: "on_track", leadId: "u-daniel", team: ["u-daniel", "u-emma", "u-noah"], startDate: daysAgo(120), dueDate: daysOut(60), budget: 36000, spent: 19400, hoursBudget: 300, progress: 55, service: "Social Content", clientAccess: true, description: "12 reels + 40 stills per month. Rolling 6-month retainer." },
    { id: "p-5", code: "OAK-2405", name: "Juniper & Sage — Product Photography Q3", clientId: "c-juniper", status: "active", health: "on_track", leadId: "u-daniel", team: ["u-daniel", "u-aisha", "u-emma"], startDate: daysAgo(20), dueDate: daysOut(30), budget: 22000, spent: 6800, hoursBudget: 180, progress: 28, service: "Photography", clientAccess: true, description: "Fall line studio photography, 60 SKUs, plus 8 UGC-style vertical spots." },
    { id: "p-6", code: "OAK-2406", name: "Bluebird Financial — Explainer Series", clientId: "c-bluebird", status: "active", health: "at_risk", leadId: "u-maya", team: ["u-maya", "u-chris", "u-aisha"], startDate: daysAgo(50), dueDate: daysOut(12), budget: 41000, spent: 30100, hoursBudget: 340, progress: 66, service: "Motion Graphics", clientAccess: false, description: "6 animated explainers. Compliance review adding a full round per episode." },
    { id: "p-7", code: "OAK-2407", name: "Atlas Logistics — Recruiting Series", clientId: "c-atlas", status: "active", health: "on_track", leadId: "u-maya", team: ["u-maya", "u-noah", "u-chris", "u-alex"], startDate: daysAgo(15), dueDate: daysOut(40), budget: 38000, spent: 5200, hoursBudget: 320, progress: 15, service: "Corporate", clientAccess: true, description: "Driver + warehouse recruiting films across two facilities. Drone b-roll heavy." },
    { id: "p-8", code: "OAK-2408", name: "Redline — Track Day Event Coverage", clientId: "c-redline", status: "active", health: "on_track", leadId: "u-maya", team: ["u-noah", "u-alex"], startDate: daysAgo(5), dueDate: daysOut(9), budget: 9500, spent: 1200, hoursBudget: 80, progress: 20, service: "Event", clientAccess: true, description: "Full-day event coverage + 48h highlight edit." },
    { id: "p-9", code: "OAK-2409", name: "Crestline — Listing Video Package (Jul)", clientId: "c-crestline", status: "planning", health: "on_track", leadId: "u-maya", team: ["u-noah"], startDate: daysOut(4), dueDate: daysOut(20), budget: 6000, spent: 0, hoursBudget: 48, progress: 0, service: "Real Estate", clientAccess: false, description: "4 listings, standard walkthrough + aerial package." },
    { id: "p-10", code: "OAK-2390", name: "Harbor & Vine — Spring Campaign", clientId: "c-harbor", status: "completed", health: "on_track", leadId: "u-maya", team: ["u-maya", "u-chris", "u-aisha"], startDate: daysAgo(160), dueDate: daysAgo(75), budget: 44000, spent: 42300, hoursBudget: 400, progress: 100, service: "Brand Film", clientAccess: true, description: "Delivered. 9.4 client satisfaction score." },
    { id: "p-11", code: "OAK-2391", name: "Wildflower Weddings — Brand Story", clientId: null, leadRef: "l-19", status: "completed", health: "on_track", leadId: "u-daniel", team: ["u-daniel", "u-emma"], startDate: daysAgo(90), dueDate: daysAgo(30), budget: 21000, spent: 19800, hoursBudget: 170, progress: 100, service: "Brand Film", clientAccess: false, description: "Delivered on time; converted from Q2 pipeline win." },
    { id: "p-12", code: "OAK-2410", name: "Bighorn Outfitters — Holiday Campaign", clientId: null, leadRef: "l-12", status: "planning", health: "on_track", leadId: "u-daniel", team: ["u-daniel", "u-aisha", "u-jade"], startDate: daysOut(14), dueDate: daysOut(75), budget: 45000, spent: 0, hoursBudget: 380, progress: 0, service: "Commercial", clientAccess: false, description: "Won deal from pipeline. Kickoff scheduled; SOW countersigned." },
  ];

  /* ============ TASKS ============ */
  const T = (id, projectId, title, status, priority, assigneeId, dueIn, extra = {}) => ({
    id, projectId, title, status, priority, assigneeId,
    dueDate: dueIn === null ? null : (dueIn < 0 ? daysAgo(-dueIn) : daysOut(dueIn)),
    createdBy: extra.createdBy || "u-maya", createdAt: daysAgo(extra.age ?? between(3, 25)),
    desc: extra.desc || "", subtasks: extra.subtasks || [], checklist: extra.checklist || [],
    comments: extra.comments || [], timeEntries: extra.timeEntries || [], dependsOn: extra.dependsOn || [],
    tags: extra.tags || [], hours: extra.hours || 0, recurring: extra.recurring || null,
  });
  const tasks = [
    T("t-1", "p-1", "Final color pass on hero film", "in_progress", "high", "u-jade", 2, { desc: "Match the spring campaign LUT; client flagged skin tones in v2.", timeEntries: [{ userId: "u-jade", hours: 6.5, date: daysAgo(1) }], comments: [{ userId: "u-maya", text: "Client wants warmer tones in the patio scenes.", ts: daysAgo(1, 14) }] }),
    T("t-2", "p-1", "Cut 12 social versions (9:16 + 1:1)", "in_progress", "high", "u-chris", 4, { subtasks: [{ text: "9:16 set (6 cuts)", done: true }, { text: "1:1 set (6 cuts)", done: false }], timeEntries: [{ userId: "u-chris", hours: 11, date: daysAgo(2) }] }),
    T("t-3", "p-1", "Caption + delivery specs sheet", "todo", "medium", "u-noah", 5),
    T("t-4", "p-1", "Client review session — round 3", "todo", "high", "u-maya", 6, { dependsOn: ["t-1", "t-2"] }),
    T("t-5", "p-1", "Archive raw footage to LTO", "todo", "low", "u-ben", 14),
    T("t-6", "p-2", "Re-book Colorado drone unit", "in_progress", "urgent", "u-maya", 1, { desc: "Weather delay burned the original window. Alex holds Part 107 waiver for the site.", comments: [{ userId: "u-alex", text: "I can fly Thu–Sat if the front clears.", ts: daysAgo(0, 9) }] }),
    T("t-7", "p-2", "Location permits — Ridgeline trailhead", "review", "high", "u-noah", 3),
    T("t-8", "p-2", "Assembly edit of studio unit footage", "in_progress", "medium", "u-chris", 7, { timeEntries: [{ userId: "u-chris", hours: 9, date: daysAgo(1) }] }),
    T("t-9", "p-2", "Revised shoot schedule to client", "done", "high", "u-maya", -1),
    T("t-10", "p-3", "Beacon Downtown — final edit", "review", "urgent", "u-chris", 2, { desc: "Round 4. Lock this week or we miss the launch window." }),
    T("t-11", "p-3", "Beacon Riverside — pickup shots list", "in_progress", "high", "u-daniel", 3),
    T("t-12", "p-3", "Beacon Uptown — VO record + mix", "todo", "high", "u-emma", 5, { dependsOn: ["t-11"] }),
    T("t-13", "p-3", "Consolidated change-order for extra review rounds", "todo", "urgent", "u-daniel", 1, { desc: "Two rounds beyond SOW. Draft CO for $6,400 and route to approvals." }),
    T("t-14", "p-4", "July reel batch (12) — shoot day", "done", "medium", "u-noah", -3),
    T("t-15", "p-4", "July reel batch — edit + captions", "in_progress", "medium", "u-emma", 4, { recurring: "monthly" }),
    T("t-16", "p-4", "July stills retouch (40)", "todo", "medium", "u-emma", 6, { recurring: "monthly" }),
    T("t-17", "p-4", "August content calendar draft", "todo", "low", "u-daniel", 10, { recurring: "monthly" }),
    T("t-18", "p-5", "Studio build — fall palette sets", "done", "medium", "u-aisha", -2),
    T("t-19", "p-5", "SKU shot list sign-off", "in_progress", "high", "u-daniel", 2),
    T("t-20", "p-5", "Shoot day 1 — hero SKUs (20)", "todo", "high", "u-aisha", 7, { dependsOn: ["t-19"] }),
    T("t-21", "p-6", "Episode 4 animation pass", "in_progress", "high", "u-aisha", 3, { timeEntries: [{ userId: "u-aisha", hours: 14, date: daysAgo(2) }] }),
    T("t-22", "p-6", "Episode 3 compliance revisions", "review", "urgent", "u-chris", 1, { desc: "Legal flagged disclosure timing at 0:42." }),
    T("t-23", "p-6", "Script lock — episodes 5–6", "todo", "medium", "u-maya", 8),
    T("t-24", "p-7", "Pre-production: facility walkthroughs", "in_progress", "high", "u-maya", 4),
    T("t-25", "p-7", "Interview subject shortlist from client", "todo", "medium", "u-noah", 6),
    T("t-26", "p-7", "Drone flight plan — Fort Worth DC", "todo", "medium", "u-alex", 9),
    T("t-27", "p-8", "Gear checklist + carnet for track day", "in_progress", "high", "u-noah", 2, { checklist: [{ text: "FX6 kit ×2", done: true }, { text: "Long glass 70–200", done: true }, { text: "Mavic 4 + ND set", done: false }, { text: "Audio: 2× wireless lavs", done: false }] }),
    T("t-28", "p-8", "Confirm paddock access passes", "todo", "medium", "u-noah", 3),
    T("t-29", "p-9", "Crestline July listings — intake form", "todo", "low", "u-noah", 5),
    T("t-30", "p-12", "Bighorn kickoff deck", "todo", "high", "u-daniel", 10),
    T("t-31", null, "Q3 equipment insurance renewal docs", "in_progress", "high", "u-laura", 4, { createdBy: "u-coo" }),
    T("t-32", null, "Update employee handbook — remote policy", "review", "medium", "u-hr-head", 7, { createdBy: "u-hr-head" }),
    T("t-33", null, "Migrate archive server to new NAS", "in_progress", "medium", "u-tech-head", 12, { createdBy: "u-tech-head" }),
    T("t-34", null, "Studio B acoustic treatment install", "todo", "low", "u-admin-head", 21, { createdBy: "u-coo" }),
  ];
  tasks.forEach((t) => { if (t.assigneeId === "u-laura") t.assigneeId = "u-admin-head"; });

  /* ============ FINANCE ============ */
  const svcRates = { "Brand Film": [18000, 48000], Commercial: [25000, 65000], "Social Content": [6000, 12000], Photography: [4000, 14000], "Motion Graphics": [8000, 22000], Corporate: [9000, 20000], Event: [3000, 9500], "Real Estate": [1500, 6000] };
  const invoices = [];
  let invNum = 1041;
  // Historical invoices across the past 12 months (paid) for trend data
  for (let m = 12; m >= 1; m--) {
    const count = m > 6 ? between(2, 3) : between(3, 4);
    for (let k = 0; k < count; k++) {
      const cl = pick(clients);
      const svc = pick(Object.keys(svcRates));
      const amt = between(svcRates[svc][0], svcRates[svc][1]);
      const issued = daysAgo(m * 30 - between(0, 24));
      invoices.push({
        id: "inv-" + invNum, number: "INV-" + invNum++, clientId: cl.id, projectId: null,
        amount: amt, tax: Math.round(amt * 0.0825), total: Math.round(amt * 1.0825),
        status: "paid", issuedAt: issued, dueAt: issued + 30 * DAY, paidAt: issued + between(8, 34) * DAY,
        memo: svc + " services", items: [{ desc: svc + " — production services", qty: 1, rate: amt }],
      });
    }
  }
  // Current open/recent invoices tied to live projects
  const liveInv = [
    ["c-harbor", "p-1", 24000, "sent", 12, "Summer campaign — 50% milestone"],
    ["c-summit", "p-2", 32500, "sent", 20, "Fall launch — production milestone"],
    ["c-beacon", "p-3", 42000, "overdue", 41, "Brand refresh — milestone 2 of 3"],
    ["c-nova", "p-4", 6000, "paid", 9, "July retainer"],
    ["c-bluebird", "p-6", 20500, "sent", 15, "Explainer series — episodes 1–3"],
    ["c-juniper", "p-5", 11000, "draft", 1, "Q3 photography — deposit"],
    ["c-redline", "p-8", 4750, "sent", 4, "Track day — 50% deposit"],
    ["c-atlas", "p-7", 19000, "paid", 12, "Recruiting series — deposit"],
    ["c-crestline", null, 4200, "overdue", 52, "June listing package"],
    ["c-harbor", "p-10", 22000, "paid", 70, "Spring campaign — final"],
    ["c-nova", "p-4", 6000, "paid", 39, "June retainer"],
    ["c-beacon", "p-3", 28000, "paid", 66, "Brand refresh — milestone 1 of 3"],
  ];
  liveInv.forEach((d) => {
    const issued = daysAgo(d[4]);
    invoices.push({
      id: "inv-" + invNum, number: "INV-" + invNum++, clientId: d[0], projectId: d[1],
      amount: d[2], tax: Math.round(d[2] * 0.0825), total: Math.round(d[2] * 1.0825),
      status: d[3], issuedAt: issued, dueAt: issued + 30 * DAY,
      paidAt: d[3] === "paid" ? issued + between(6, 25) * DAY : null,
      memo: d[5], items: [{ desc: d[5], qty: 1, rate: d[2] }],
    });
  });

  const expenseCats = ["Payroll", "Equipment", "Software", "Travel", "Studio Rent", "Insurance", "Contractors", "Marketing", "Utilities", "Meals"];
  const vendors = { Equipment: ["B&H Photo", "Lensrentals", "Adorama"], Software: ["Adobe", "Frame.io", "Monday? no — internal", "Dropbox"], Travel: ["Southwest Air", "Hertz", "Marriott"], "Studio Rent": ["Eastside Studio Partners"], Insurance: ["Hiscox"], Contractors: ["Alex Morgan LLC", "Jade Nguyen Color"], Marketing: ["Meta Ads", "Google Ads"], Utilities: ["Austin Energy", "Spectrum Biz"], Meals: ["Central Catering", "Torchy's"] };
  vendors.Software = ["Adobe", "Frame.io", "Dropbox", "Notion"];
  const expenses = [];
  let expN = 1;
  for (let m = 12; m >= 0; m--) {
    // recurring
    expenses.push({ id: "exp-" + expN++, category: "Studio Rent", vendor: "Eastside Studio Partners", amount: 7800, date: daysAgo(m * 30 + 2), submittedBy: "u-fin-head", status: "paid", memo: "Monthly studio + office lease" });
    expenses.push({ id: "exp-" + expN++, category: "Software", vendor: "Adobe", amount: 1420, date: daysAgo(m * 30 + 4), submittedBy: "u-tech-head", status: "paid", memo: "CC for Teams, 18 seats" });
    const extra = between(2, 4);
    for (let k = 0; k < extra; k++) {
      const cat = pick(["Equipment", "Travel", "Contractors", "Marketing", "Utilities", "Meals", "Insurance", "Software"]);
      expenses.push({ id: "exp-" + expN++, category: cat, vendor: pick(vendors[cat] || ["Misc Vendor"]), amount: between(120, cat === "Contractors" ? 6800 : cat === "Equipment" ? 4200 : 1900), date: daysAgo(m * 30 + between(1, 27)), submittedBy: pick(["u-maya", "u-noah", "u-daniel", "u-fin-head", "u-rachel"]), status: m === 0 && k === 0 ? "pending" : "paid", memo: cat + " expense" });
    }
  }
  expenses.push({ id: "exp-" + expN++, category: "Equipment", vendor: "B&H Photo", amount: 3849, date: daysAgo(2), submittedBy: "u-noah", status: "pending", memo: "Replacement FX6 top handle kit + 2× CFexpress cards", projectId: "p-8" });
  expenses.push({ id: "exp-" + expN++, category: "Travel", vendor: "Southwest Air", amount: 1268, date: daysAgo(1), submittedBy: "u-maya", status: "pending", memo: "2× DEN round trips — Summit reshoot", projectId: "p-2" });

  const payroll = [
    { id: "pay-cur", period: "Current period", runDate: daysOut(6), status: "scheduled", total: 118400, note: "Semi-monthly run. Includes June commission payout." },
    { id: "pay-1", period: "Last period", runDate: daysAgo(9), status: "paid", total: 114900, note: "Semi-monthly run." },
    { id: "pay-2", period: "Two periods ago", runDate: daysAgo(24), status: "paid", total: 113200, note: "Semi-monthly run." },
    { id: "pay-3", period: "Three periods ago", runDate: daysAgo(39), status: "paid", total: 116750, note: "Includes contractor invoices." },
  ];

  const commissions = [
    { id: "com-1", userId: "u-jordan", month: "Last month", deals: 2, revenue: 66000, rate: 0.06, amount: 3960, status: "approved" },
    { id: "com-2", userId: "u-sales-head", month: "Last month", deals: 1, revenue: 45000, rate: 0.04, amount: 1800, status: "approved" },
    { id: "com-3", userId: "u-zoe", month: "Last month", deals: 0, meetingsBooked: 9, amount: 450, rate: 50, status: "approved", note: "$50 per qualified meeting" },
    { id: "com-4", userId: "u-liam", month: "Last month", deals: 0, meetingsBooked: 6, amount: 300, rate: 50, status: "approved", note: "$50 per qualified meeting" },
    { id: "com-5", userId: "u-jordan", month: "This month", deals: 1, revenue: 21000, rate: 0.06, amount: 1260, status: "pending" },
    { id: "com-6", userId: "u-zoe", month: "This month", deals: 0, meetingsBooked: 4, amount: 200, rate: 50, status: "pending", note: "$50 per qualified meeting" },
  ];

  const budgets = [
    { id: "b-prod", dept: "Production", annual: 620000, spentYTD: 341000 },
    { id: "b-crea", dept: "Creative", annual: 480000, spentYTD: 236000 },
    { id: "b-sales", dept: "Sales", annual: 310000, spentYTD: 152000 },
    { id: "b-tech", dept: "Technology", annual: 180000, spentYTD: 97000 },
    { id: "b-hr", dept: "Human Resources", annual: 150000, spentYTD: 71000 },
    { id: "b-admin", dept: "Administration", annual: 140000, spentYTD: 69000 },
    { id: "b-fin", dept: "Finance", annual: 160000, spentYTD: 78000 },
  ];

  /* ============ EQUIPMENT ============ */
  const equipment = [
    { id: "e-1", assetTag: "OAK-CAM-001", name: "Sony FX6 (A-cam)", category: "Cameras", serial: "FX6-88231", status: "checked_out", assignedTo: "u-chris", projectId: "p-1", condition: "good", value: 5999, purchaseDate: daysAgo(700), location: "Field — Harbor shoot" },
    { id: "e-2", assetTag: "OAK-CAM-002", name: "Sony FX6 (B-cam)", category: "Cameras", serial: "FX6-88547", status: "available", condition: "good", value: 5999, purchaseDate: daysAgo(700), location: "Studio A cage" },
    { id: "e-3", assetTag: "OAK-CAM-003", name: "Sony FX3", category: "Cameras", serial: "FX3-11209", status: "checked_out", assignedTo: "u-noah", projectId: "p-8", condition: "good", value: 3899, purchaseDate: daysAgo(500), location: "Field — Redline" },
    { id: "e-4", assetTag: "OAK-CAM-004", name: "Canon R5 C (stills/hybrid)", category: "Cameras", serial: "R5C-70441", status: "available", condition: "good", value: 4499, purchaseDate: daysAgo(420), location: "Studio A cage" },
    { id: "e-5", assetTag: "OAK-LEN-001", name: "Sony 24–70 f/2.8 GM II", category: "Lenses", serial: "GM-55102", status: "checked_out", assignedTo: "u-chris", projectId: "p-1", condition: "good", value: 2299, purchaseDate: daysAgo(650), location: "Field" },
    { id: "e-6", assetTag: "OAK-LEN-002", name: "Sony 70–200 f/2.8 GM II", category: "Lenses", serial: "GM-61888", status: "available", condition: "good", value: 2799, purchaseDate: daysAgo(650), location: "Studio A cage" },
    { id: "e-7", assetTag: "OAK-LEN-003", name: "Sigma Cine Prime Set (5)", category: "Lenses", serial: "SIG-CP5-031", status: "maintenance", condition: "fair", value: 21500, purchaseDate: daysAgo(900), location: "MTF Service Austin", note: "35mm focus ring servicing — due back Fri" },
    { id: "e-8", assetTag: "OAK-LIT-001", name: "Aputure 600d Pro (×2 kit)", category: "Lighting", serial: "AP600-2201", status: "checked_out", assignedTo: "u-aisha", projectId: "p-5", condition: "good", value: 3780, purchaseDate: daysAgo(540), location: "Studio B" },
    { id: "e-9", assetTag: "OAK-LIT-002", name: "Aputure Nova P600c (×2 kit)", category: "Lighting", serial: "APNV-1187", status: "available", condition: "good", value: 4160, purchaseDate: daysAgo(430), location: "Studio A cage" },
    { id: "e-10", assetTag: "OAK-AUD-001", name: "Sennheiser MKH 416 boom kit", category: "Audio", serial: "MKH-90711", status: "available", condition: "good", value: 1249, purchaseDate: daysAgo(800), location: "Studio A cage" },
    { id: "e-11", assetTag: "OAK-AUD-002", name: "Wireless lav kit (4× DJI Mic 2)", category: "Audio", serial: "DJM-44520", status: "checked_out", assignedTo: "u-noah", projectId: "p-8", condition: "good", value: 1320, purchaseDate: daysAgo(300), location: "Field — Redline" },
    { id: "e-12", assetTag: "OAK-DRN-001", name: "DJI Mavic 4 Pro", category: "Drones", serial: "MAV4-00981", status: "checked_out", assignedTo: "u-alex", projectId: "p-2", condition: "good", value: 2699, purchaseDate: daysAgo(200), location: "Field — Colorado" },
    { id: "e-13", assetTag: "OAK-DRN-002", name: "DJI Inspire 3", category: "Drones", serial: "INS3-00214", status: "damaged", condition: "damaged", value: 16499, purchaseDate: daysAgo(350), location: "Studio A cage", note: "Gimbal impact on Redline recce — damage report DR-118 filed, awaiting repair quote" },
    { id: "e-14", assetTag: "OAK-CMP-001", name: "Mac Studio M4 Ultra — Edit 1", category: "Computers", serial: "MSU-77120", status: "assigned", assignedTo: "u-chris", condition: "good", value: 6499, purchaseDate: daysAgo(260), location: "Edit Bay 1" },
    { id: "e-15", assetTag: "OAK-CMP-002", name: "Mac Studio M4 Max — Edit 2", category: "Computers", serial: "MSU-77415", status: "assigned", assignedTo: "u-emma", condition: "good", value: 4299, purchaseDate: daysAgo(260), location: "Edit Bay 2" },
    { id: "e-16", assetTag: "OAK-CMP-003", name: "MacBook Pro 16 — Field 1", category: "Computers", serial: "MBP-90233", status: "checked_out", assignedTo: "u-maya", condition: "good", value: 3499, purchaseDate: daysAgo(400), location: "Field" },
    { id: "e-17", assetTag: "OAK-STO-001", name: "OWC Thunderbay NAS 96TB", category: "Storage", serial: "OWC-55009", status: "assigned", assignedTo: "u-tech-head", condition: "good", value: 5899, purchaseDate: daysAgo(180), location: "Server room" },
    { id: "e-18", assetTag: "OAK-STO-002", name: "Shuttle SSD kit (6× 4TB)", category: "Storage", serial: "SSD-KIT-04", status: "available", condition: "good", value: 2340, purchaseDate: daysAgo(220), location: "Studio A cage" },
    { id: "e-19", assetTag: "OAK-ACC-001", name: "DJI RS 4 Pro gimbal", category: "Accessories", serial: "RS4-31002", status: "available", condition: "good", value: 869, purchaseDate: daysAgo(310), location: "Studio A cage" },
    { id: "e-20", assetTag: "OAK-ACC-002", name: "Dana Dolly + track", category: "Accessories", serial: "DD-2019-2", status: "available", condition: "fair", value: 1450, purchaseDate: daysAgo(1100), location: "Studio B" },
    { id: "e-21", assetTag: "OAK-ACC-003", name: "C-stand package (×12)", category: "Accessories", serial: "CS-PKG-01", status: "available", condition: "good", value: 2160, purchaseDate: daysAgo(1100), location: "Studio B" },
    { id: "e-22", assetTag: "OAK-LIT-003", name: "Astera Titan Tube kit (×8)", category: "Lighting", serial: "AST-8842", status: "maintenance", condition: "fair", value: 9600, purchaseDate: daysAgo(600), location: "Studio A cage", note: "2 tubes with flicker at low dim — firmware + cell check" },
  ];

  /* ============ APPROVALS ============ */
  const approvals = [
    { id: "ap-1", type: "expense", title: "FX6 top handle kit + media — $3,849", refType: "expense", refId: "exp-" + (expN - 2), requestedBy: "u-noah", requestedAt: daysAgo(2), amount: 3849, status: "pending", priority: "medium", approverRoles: ["dept_head:Production", "exec"], decisions: [], description: "Replacement after track-day damage. Needed before Redline shoot." },
    { id: "ap-2", type: "expense", title: "Travel — Summit reshoot flights $1,268", refType: "expense", refId: "exp-" + (expN - 1), requestedBy: "u-maya", requestedAt: daysAgo(1), amount: 1268, status: "pending", priority: "high", approverRoles: ["exec"], decisions: [], description: "Two Denver round trips for the weather-delayed drone unit." },
    { id: "ap-3", type: "contract", title: "Change order — Beacon extra review rounds $6,400", refType: "project", refId: "p-3", requestedBy: "u-daniel", requestedAt: daysAgo(1), amount: 6400, status: "pending", priority: "urgent", approverRoles: ["exec"], decisions: [], description: "Two review rounds beyond SOW on the brand refresh films. CO drafted, needs exec sign-off before sending." },
    { id: "ap-4", type: "hire", title: "New hire — Editor II (Production)", refType: "candidate", refId: "cand-2", requestedBy: "u-prod-head", requestedAt: daysAgo(3), amount: 78000, status: "pending", priority: "high", approverRoles: ["hr", "ceo"], decisions: [{ userId: "u-hr-head", decision: "approved", ts: daysAgo(2), note: "Background + references clear." }], description: "Offer for Marcus Doyle at $78k. HR approved; awaiting CEO." },
    { id: "ap-5", type: "equipment", title: "Purchase — Inspire 3 gimbal repair $4,850", refType: "equipment", refId: "e-13", requestedBy: "u-tech-head", requestedAt: daysAgo(4), amount: 4850, status: "pending", priority: "medium", approverRoles: ["exec"], decisions: [], description: "Authorized DJI repair quote for DR-118. Alternative is $16.5k replacement." },
    { id: "ap-6", type: "timeoff", title: "Time off — Chris Turner, 4 days", refType: "timeoff", refId: "to-3", requestedBy: "u-chris", requestedAt: daysAgo(2), status: "pending", priority: "low", approverRoles: ["dept_head:Production"], decisions: [], description: "Vacation in ~3 weeks. Beacon final edit locks before then." },
    { id: "ap-7", type: "invoice", title: "Send invoice — Juniper Q3 deposit $11,000", refType: "invoice", refId: invoices.find(i => i.status === "draft") ? invoices.find(i => i.status === "draft").id : null, requestedBy: "u-rachel", requestedAt: daysAgo(1), amount: 11000, status: "pending", priority: "medium", approverRoles: ["dept_head:Finance", "exec"], decisions: [], description: "Draft deposit invoice for Q3 photography. Confirm terms: net 15." },
    { id: "ap-8", type: "expense", title: "Aputure 600d rental for Beacon pickups — $640", refType: "expense", refId: null, requestedBy: "u-daniel", requestedAt: daysAgo(6), amount: 640, status: "approved", priority: "low", approverRoles: ["dept_head:Creative"], decisions: [{ userId: "u-crea-head", decision: "approved", ts: daysAgo(5), note: "Approved — bill to p-3." }], description: "" },
    { id: "ap-9", type: "promotion", title: "Promotion — Emma Ruiz to Designer II", refType: "user", refId: "u-emma", requestedBy: "u-crea-head", requestedAt: daysAgo(8), amount: 62000, status: "approved", priority: "medium", approverRoles: ["hr", "ceo"], decisions: [{ userId: "u-hr-head", decision: "approved", ts: daysAgo(7) }, { userId: "u-ceo", decision: "approved", ts: daysAgo(6), note: "Effective next pay period." }], description: "" },
    { id: "ap-10", type: "expense", title: "Conference — SXSW booth deposit $2,500", refType: "expense", refId: null, requestedBy: "u-sales-head", requestedAt: daysAgo(12), amount: 2500, status: "rejected", priority: "low", approverRoles: ["exec"], decisions: [{ userId: "u-cfo", decision: "rejected", ts: daysAgo(11), note: "Revisit with full sponsorship plan and pipeline targets." }], description: "" },
  ];

  /* ============ HR ============ */
  const candidates = [
    { id: "cand-1", name: "Sarah Whitman", roleApplied: "Editor II", dept: "Production", stage: "interview", appliedAt: daysAgo(14), rating: 4, source: "LinkedIn", email: "sarah.whitman@gmail.com", notes: "Strong doc background. Panel 2 scheduled." },
    { id: "cand-2", name: "Marcus Doyle", roleApplied: "Editor II", dept: "Production", stage: "offer", appliedAt: daysAgo(24), rating: 5, source: "Referral (Chris T.)", email: "mdoyle.edit@gmail.com", notes: "Offer at $78k pending CEO approval (AP-4)." },
    { id: "cand-3", name: "Priya Nair", roleApplied: "Motion Designer", dept: "Creative", stage: "screen", appliedAt: daysAgo(6), rating: 4, source: "Careers page", email: "priya.nair.design@gmail.com", notes: "Reel is excellent; salary expectation high end of band." },
    { id: "cand-4", name: "Jake Sullivan", roleApplied: "Motion Designer", dept: "Creative", stage: "applied", appliedAt: daysAgo(3), rating: 0, source: "Careers page", email: "jsullivan.mp4@gmail.com", notes: "" },
    { id: "cand-5", name: "Renee Alvarez", roleApplied: "Account Executive", dept: "Sales", stage: "interview", appliedAt: daysAgo(10), rating: 3, source: "Indeed", email: "renee.alv@gmail.com", notes: "Agency sales background; verifying book of business claims." },
    { id: "cand-6", name: "Kofi Mensah", roleApplied: "SDR / Cold Caller", dept: "Sales", stage: "screen", appliedAt: daysAgo(5), rating: 4, source: "Referral (Zoe A.)", email: "kofi.mensah@gmail.com", notes: "" },
    { id: "cand-7", name: "Lily Zhang", roleApplied: "Production Intern (Fall)", dept: "Production", stage: "applied", appliedAt: daysAgo(2), rating: 0, source: "UT Austin career fair", email: "lzhang@utexas.edu", notes: "" },
    { id: "cand-8", name: "Dominic Reyes", roleApplied: "SDR / Cold Caller", dept: "Sales", stage: "rejected", appliedAt: daysAgo(20), rating: 2, source: "Indeed", email: "dom.reyes@gmail.com", notes: "Not enough phone experience for the desk." },
  ];

  const timeOff = [
    { id: "to-1", userId: "u-aisha", type: "Vacation", start: daysOut(10), end: daysOut(14), days: 5, status: "approved", reason: "Family trip" },
    { id: "to-2", userId: "u-zoe", type: "Sick", start: daysAgo(4), end: daysAgo(4), days: 1, status: "approved", reason: "" },
    { id: "to-3", userId: "u-chris", type: "Vacation", start: daysOut(21), end: daysOut(24), days: 4, status: "pending", reason: "Long weekend + 2" },
    { id: "to-4", userId: "u-noah", type: "Personal", start: daysOut(8), end: daysOut(8), days: 1, status: "pending", reason: "DMV appointment" },
    { id: "to-5", userId: "u-hr-head", type: "Vacation", start: daysAgo(30), end: daysAgo(26), days: 5, status: "approved", reason: "" },
    { id: "to-6", userId: "u-emma", type: "Vacation", start: daysOut(35), end: daysOut(39), days: 5, status: "pending", reason: "" },
  ];

  const reviews = [
    { id: "rev-1", userId: "u-chris", period: "H1", reviewerId: "u-prod-head", score: 4.6, status: "complete", summary: "Consistently strong edits; take more client-facing reps in H2." },
    { id: "rev-2", userId: "u-emma", period: "H1", reviewerId: "u-crea-head", score: 4.4, status: "complete", summary: "Promotion approved to Designer II. Grow motion skills." },
    { id: "rev-3", userId: "u-noah", period: "H1", reviewerId: "u-prod-head", score: 3.9, status: "complete", summary: "Reliable on set. Improve prep checklists and callsheet accuracy." },
    { id: "rev-4", userId: "u-zoe", period: "H1", reviewerId: "u-sales-head", score: 4.2, status: "complete", summary: "Top meeting-set rate on the desk. Coach on discovery depth." },
    { id: "rev-5", userId: "u-liam", period: "H1", reviewerId: "u-sales-head", score: 3.4, status: "draft", summary: "Call volume below target 3 of 6 months. 30-day volume plan in place." },
    { id: "rev-6", userId: "u-jordan", period: "H1", reviewerId: "u-sales-head", score: 4.7, status: "complete", summary: "Exceeded quota. Ready for larger accounts." },
  ];

  const hrActions = [
    { id: "hra-1", userId: "u-liam", type: "coaching", date: daysAgo(18), issuedBy: "u-sales-head", summary: "Call volume improvement plan — 60 dials/day target for 30 days.", status: "active" },
    { id: "hra-2", userId: "u-noah", type: "writeup", date: daysAgo(45), issuedBy: "u-prod-head", summary: "Left FX3 kit unsecured in vehicle overnight. Equipment policy review completed.", status: "closed" },
  ];

  /* ============ COMMUNICATIONS ============ */
  const comms = [];
  let cN = 1;
  const CALL_OUTCOMES = ["no_answer", "voicemail", "gatekeeper", "connected", "meeting_set", "not_interested", "callback"];
  const callNotes = {
    connected: ["Spoke with DM. Walked through reel; interest in Q4 campaign work.", "Good conversation — budget forming for fall. Wants case studies.", "Discussed scope; they're comparing two other agencies."],
    meeting_set: ["Booked discovery for next week. Calendar invite sent.", "Meeting set with owner + marketing lead. Prep one-pager."],
    voicemail: ["Left VM referencing referral. Will try Thursday AM.", "VM #2. Switching to email touch next."],
    gatekeeper: ["Gatekeeper took a message; DM travels Mondays.", "Got DM's direct line from front desk."],
    no_answer: ["No answer, no VM box.", "Rang out. Flag for afternoon attempt."],
    not_interested: ["Just signed with another vendor. Revisit in 6 months.", "No budget this year. Keep on nurture list."],
    callback: ["Asked to call back after their board meeting.", "Callback requested for Friday 2pm — on calendar."],
  };
  // Seeded cold-call history on leads
  leads.forEach((l) => {
    const n = Math.min(l.touches, 6);
    for (let k = 0; k < n; k++) {
      const outcome = k === n - 1 && l.stage === "meeting" ? "meeting_set" : pick(CALL_OUTCOMES);
      comms.push({
        id: "cm-" + cN++, kind: "call", direction: "outbound", leadId: l.id, clientId: null,
        userId: l.assignedTo, phone: l.phone, ts: daysAgo(between(1, 40), between(9, 16), between(0, 59)),
        durationSec: outcome === "connected" || outcome === "meeting_set" ? between(180, 900) : between(20, 90),
        outcome, notes: pick(callNotes[outcome] || ["Logged."]),
        recording: outcome === "connected" || outcome === "meeting_set" ? "rec_" + l.id + "_" + k + ".mp3" : null,
        followUpAt: outcome === "callback" || outcome === "voicemail" ? daysOut(between(1, 5)) : null,
        nextAction: outcome === "meeting_set" ? "Run discovery meeting" : outcome === "callback" ? "Return call as scheduled" : null,
      });
    }
  });
  // Client-side comms
  const clientComms = [
    ["email", "c-harbor", "u-jordan", 1, "Round 3 review link sent to Isabella with change log."],
    ["call", "c-harbor", "u-maya", 2, "Isabella flagged skin tones in patio scenes; color note passed to Jade."],
    ["meeting", "c-beacon", "u-daniel", 3, "Weekly status with Diane. Escalated review-round overrun; CO discussed."],
    ["email", "c-beacon", "u-daniel", 1, "Sent change-order draft summary ahead of approval."],
    ["call", "c-summit", "u-maya", 0, "Ryan OK with revised drone window if we hit the 25th deadline."],
    ["sms", "c-redline", "u-noah", 1, "Vince confirmed paddock passes will be at will-call."],
    ["meeting", "c-atlas", "u-maya", 4, "Facility walkthrough scheduling with Greg; two sites confirmed."],
    ["email", "c-bluebird", "u-maya", 2, "Compliance notes for Ep3 received; 0:42 disclosure timing fix required."],
    ["voice_note", "c-juniper", "u-daniel", 3, "Hana voice note: loves the fall palette test frames."],
    ["note", "c-nova", "u-daniel", 5, "Marcus hinted at expanding retainer to include email creative in Q4."],
    ["email", "c-crestline", "u-rachel", 6, "Second notice sent on overdue June invoice."],
    ["call", "c-clearwater", "u-jordan", 12, "Quarterly check-in; budget unfreeze expected October."],
  ];
  clientComms.forEach((d) => {
    comms.push({ id: "cm-" + cN++, kind: d[0], direction: "outbound", clientId: d[1], leadId: null, userId: d[2], ts: daysAgo(d[3], between(9, 17), between(0, 59)), durationSec: d[0] === "call" ? between(240, 1500) : d[0] === "meeting" ? 1800 : null, outcome: d[0] === "call" ? "connected" : null, notes: d[4], recording: null, followUpAt: null, nextAction: null });
  });

  /* ============ MEETINGS / CALENDAR ============ */
  const meetings = [
    { id: "m-1", title: "Discovery — Lonestar Brewing", ts: daysOut(2, 10, 0), durationMin: 45, ownerId: "u-zoe", attendees: ["u-zoe", "u-jordan"], leadId: "l-1", location: "Zoom" },
    { id: "m-2", title: "Beacon weekly status", ts: daysOut(1, 14, 0), durationMin: 30, ownerId: "u-daniel", attendees: ["u-daniel", "u-maya"], clientId: "c-beacon", location: "Zoom", recurring: "weekly" },
    { id: "m-3", title: "Exec staff meeting", ts: daysOut(1, 9, 0), durationMin: 60, ownerId: "u-ceo", attendees: ["u-ceo", "u-coo", "u-cco", "u-cso", "u-cfo", "u-owner"], location: "Boardroom", recurring: "weekly", private: true },
    { id: "m-4", title: "Panel 2 — Sarah Whitman (Editor II)", ts: daysOut(3, 11, 0), durationMin: 60, ownerId: "u-hr-head", attendees: ["u-hr-head", "u-prod-head", "u-chris"], candidateId: "cand-1", location: "Studio conference" },
    { id: "m-5", title: "Discovery — Frio River Resorts", ts: daysOut(4, 13, 30), durationMin: 45, ownerId: "u-sales-head", attendees: ["u-sales-head", "u-jordan"], leadId: "l-16", location: "Zoom" },
    { id: "m-6", title: "Bighorn kickoff (internal)", ts: daysOut(6, 10, 0), durationMin: 60, ownerId: "u-daniel", attendees: ["u-daniel", "u-aisha", "u-jade", "u-cco"], projectId: "p-12", location: "Studio conference" },
    { id: "m-7", title: "All hands — July", ts: daysOut(9, 16, 0), durationMin: 45, ownerId: "u-ceo", attendees: "all", location: "Studio B" },
    { id: "m-8", title: "Q3 pipeline review", ts: daysOut(2, 15, 0), durationMin: 60, ownerId: "u-cso", attendees: ["u-cso", "u-sales-head", "u-jordan", "u-zoe", "u-liam"], location: "Boardroom" },
  ];

  /* ============ LIBRARY ============ */
  const resources = [
    { id: "r-1", name: "Master Services Agreement — 2026", category: "Contracts", type: "docx", size: 84000, uploadedBy: "u-coo", uploadedAt: daysAgo(90), tags: ["legal", "template"], minRole: "project_lead", version: 3 },
    { id: "r-2", name: "Statement of Work Template", category: "Contracts", type: "docx", size: 61000, uploadedBy: "u-coo", uploadedAt: daysAgo(90), tags: ["legal", "template"], minRole: "project_lead", version: 5 },
    { id: "r-3", name: "Employee Handbook v4.2", category: "Handbooks", type: "pdf", size: 2400000, uploadedBy: "u-hr-head", uploadedAt: daysAgo(30), tags: ["hr", "policy"], minRole: "intern", version: 42 },
    { id: "r-4", name: "Client Onboarding SOP", category: "SOPs", type: "pdf", size: 310000, uploadedBy: "u-coo", uploadedAt: daysAgo(120), tags: ["process"], minRole: "junior", version: 2 },
    { id: "r-5", name: "Shoot Day Run-of-Show Template", category: "Production", type: "xlsx", size: 44000, uploadedBy: "u-prod-head", uploadedAt: daysAgo(60), tags: ["template", "production"], minRole: "intern", version: 4 },
    { id: "r-6", name: "Callsheet Template 2026", category: "Production", type: "xlsx", size: 39000, uploadedBy: "u-prod-head", uploadedAt: daysAgo(60), tags: ["template"], minRole: "intern", version: 7 },
    { id: "r-7", name: "Oakframe Brand Guidelines", category: "Brand Assets", type: "pdf", size: 18500000, uploadedBy: "u-cco", uploadedAt: daysAgo(200), tags: ["brand"], minRole: "intern", version: 3 },
    { id: "r-8", name: "Logo Pack (SVG/PNG)", category: "Brand Assets", type: "zip", size: 6200000, uploadedBy: "u-cco", uploadedAt: daysAgo(200), tags: ["brand"], minRole: "intern", version: 2 },
    { id: "r-9", name: "Cold Call Script — Hospitality", category: "Sales", type: "docx", size: 28000, uploadedBy: "u-sales-head", uploadedAt: daysAgo(40), tags: ["sales", "script"], depts: ["Sales", "Executive"], minRole: "intern", version: 6 },
    { id: "r-10", name: "Objection Handling Playbook", category: "Sales", type: "pdf", size: 410000, uploadedBy: "u-sales-head", uploadedAt: daysAgo(40), tags: ["sales"], depts: ["Sales", "Executive"], minRole: "intern", version: 3 },
    { id: "r-11", name: "Pricing & Rate Card 2026", category: "Sales", type: "pdf", size: 120000, uploadedBy: "u-cso", uploadedAt: daysAgo(80), tags: ["sales", "pricing"], depts: ["Sales", "Finance", "Executive"], minRole: "senior", version: 4 },
    { id: "r-12", name: "Expense Policy", category: "Finance", type: "pdf", size: 96000, uploadedBy: "u-fin-head", uploadedAt: daysAgo(150), tags: ["finance", "policy"], minRole: "intern", version: 2 },
    { id: "r-13", name: "Editorial Style Guide", category: "Creative", type: "pdf", size: 5100000, uploadedBy: "u-crea-head", uploadedAt: daysAgo(110), tags: ["creative"], minRole: "intern", version: 5 },
    { id: "r-14", name: "Color Pipeline SOP (DaVinci)", category: "SOPs", type: "pdf", size: 380000, uploadedBy: "u-prod-head", uploadedAt: daysAgo(75), tags: ["post", "process"], minRole: "contractor", version: 3 },
    { id: "r-15", name: "Drone Ops Manual + Part 107 Checklists", category: "Equipment Guides", type: "pdf", size: 900000, uploadedBy: "u-tech-head", uploadedAt: daysAgo(95), tags: ["drone", "safety"], minRole: "contractor", version: 4 },
    { id: "r-16", name: "FX6 Field Setup Guide", category: "Equipment Guides", type: "pdf", size: 640000, uploadedBy: "u-tech-head", uploadedAt: daysAgo(95), tags: ["camera"], minRole: "intern", version: 2 },
    { id: "r-17", name: "Talent Release Form", category: "Legal", type: "pdf", size: 52000, uploadedBy: "u-coo", uploadedAt: daysAgo(300), tags: ["legal", "release"], minRole: "intern", version: 3 },
    { id: "r-18", name: "Location Release Form", category: "Legal", type: "pdf", size: 50000, uploadedBy: "u-coo", uploadedAt: daysAgo(300), tags: ["legal", "release"], minRole: "intern", version: 3 },
    { id: "r-19", name: "New Hire Onboarding Checklist", category: "HR", type: "xlsx", size: 33000, uploadedBy: "u-hr-head", uploadedAt: daysAgo(55), tags: ["hr", "onboarding"], depts: ["Human Resources", "Executive"], minRole: "senior", version: 6 },
    { id: "r-20", name: "Interview Scorecard Template", category: "HR", type: "docx", size: 27000, uploadedBy: "u-hr-head", uploadedAt: daysAgo(55), tags: ["hr", "hiring"], depts: ["Human Resources", "Executive"], minRole: "senior", version: 2 },
    { id: "r-21", name: "Social Content QC Checklist", category: "Templates", type: "pdf", size: 45000, uploadedBy: "u-crea-head", uploadedAt: daysAgo(35), tags: ["qc", "social"], minRole: "intern", version: 1 },
    { id: "r-22", name: "Backup & Archive SOP (3-2-1)", category: "Technology", type: "pdf", size: 210000, uploadedBy: "u-tech-head", uploadedAt: daysAgo(65), tags: ["it", "archive"], minRole: "junior", version: 2 },
    { id: "r-23", name: "Case Study — Harbor & Vine Spring", category: "Marketing", type: "pdf", size: 8400000, uploadedBy: "u-sales-head", uploadedAt: daysAgo(50), tags: ["case-study"], minRole: "intern", version: 1 },
    { id: "r-24", name: "Training — Client Communication 101", category: "Training", type: "mp4", size: 245000000, uploadedBy: "u-hr-head", uploadedAt: daysAgo(140), tags: ["training"], minRole: "intern", version: 1 },
  ];

  const documents = [
    { id: "d-1", name: "MSA — Harbor & Vine (signed)", category: "Contracts", type: "pdf", size: 410000, clientId: "c-harbor", uploadedBy: "u-coo", uploadedAt: daysAgo(690), tags: ["signed"], confidential: false, version: 1 },
    { id: "d-2", name: "SOW — Summer Menu Campaign (signed)", category: "Contracts", type: "pdf", size: 380000, clientId: "c-harbor", projectId: "p-1", uploadedBy: "u-maya", uploadedAt: daysAgo(46), tags: ["signed", "sow"], confidential: false, version: 2 },
    { id: "d-3", name: "SOW — Summit Fall Launch (signed)", category: "Contracts", type: "pdf", size: 395000, clientId: "c-summit", projectId: "p-2", uploadedBy: "u-maya", uploadedAt: daysAgo(31), tags: ["signed", "sow"], confidential: false, version: 1 },
    { id: "d-4", name: "SOW — Beacon Brand Refresh (signed)", category: "Contracts", type: "pdf", size: 420000, clientId: "c-beacon", projectId: "p-3", uploadedBy: "u-daniel", uploadedAt: daysAgo(61), tags: ["signed", "sow"], confidential: false, version: 1 },
    { id: "d-5", name: "Change Order CO-118 — Beacon (draft)", category: "Contracts", type: "docx", size: 61000, clientId: "c-beacon", projectId: "p-3", uploadedBy: "u-daniel", uploadedAt: daysAgo(1), tags: ["draft", "change-order"], confidential: false, version: 1 },
    { id: "d-6", name: "NDA — Bluebird Financial (mutual)", category: "NDAs", type: "pdf", size: 220000, clientId: "c-bluebird", uploadedBy: "u-coo", uploadedAt: daysAgo(480), tags: ["signed", "nda"], confidential: false, version: 1 },
    { id: "d-7", name: "General Liability Policy 2026", category: "Insurance", type: "pdf", size: 1900000, uploadedBy: "u-fin-head", uploadedAt: daysAgo(180), tags: ["insurance"], confidential: true, version: 1 },
    { id: "d-8", name: "Equipment Rider — Hiscox 2026", category: "Insurance", type: "pdf", size: 850000, uploadedBy: "u-fin-head", uploadedAt: daysAgo(180), tags: ["insurance", "equipment"], confidential: true, version: 2 },
    { id: "d-9", name: "2025 Federal Return (filed)", category: "Tax Documents", type: "pdf", size: 3100000, uploadedBy: "u-cfo", uploadedAt: daysAgo(85), tags: ["tax"], confidential: true, version: 1 },
    { id: "d-10", name: "Q2 Sales Tax Filing — TX", category: "Tax Documents", type: "pdf", size: 240000, uploadedBy: "u-rachel", uploadedAt: daysAgo(18), tags: ["tax"], confidential: true, version: 1 },
    { id: "d-11", name: "Talent releases — Harbor summer shoot (14)", category: "Releases", type: "zip", size: 5200000, clientId: "c-harbor", projectId: "p-1", uploadedBy: "u-noah", uploadedAt: daysAgo(28), tags: ["release"], confidential: false, version: 1 },
    { id: "d-12", name: "Location release — Ridgeline Trailhead", category: "Releases", type: "pdf", size: 130000, clientId: "c-summit", projectId: "p-2", uploadedBy: "u-noah", uploadedAt: daysAgo(9), tags: ["release"], confidential: false, version: 1 },
    { id: "d-13", name: "Offer letter — M. Doyle (draft)", category: "Employee Files", type: "pdf", size: 98000, uploadedBy: "u-hr-head", uploadedAt: daysAgo(3), tags: ["offer", "draft"], confidential: true, version: 2 },
    { id: "d-14", name: "Damage report DR-118 — Inspire 3", category: "Project Documents", type: "pdf", size: 310000, uploadedBy: "u-noah", uploadedAt: daysAgo(11), tags: ["equipment", "incident"], confidential: false, version: 1 },
    { id: "d-15", name: "W-9 — Alex Morgan LLC", category: "Employee Files", type: "pdf", size: 76000, uploadedBy: "u-fin-head", uploadedAt: daysAgo(295), tags: ["contractor", "tax"], confidential: true, version: 1 },
    { id: "d-16", name: "Retainer agreement — Nova Fitness (signed)", category: "Contracts", type: "pdf", size: 340000, clientId: "c-nova", projectId: "p-4", uploadedBy: "u-jordan", uploadedAt: daysAgo(120), tags: ["signed", "retainer"], confidential: false, version: 1 },
  ];

  /* ============ EXEC: STRATEGY / RISK / BOARD ============ */
  const initiatives = [
    { id: "in-1", title: "Grow retainer revenue to 35% of total", ownerId: "u-ceo", quarter: "Q3", progress: 55, status: "on_track", keyResults: [{ text: "Sign 2 new monthly retainers", done: 1, target: 2 }, { text: "Renew Nova at +20%", done: 0, target: 1 }] },
    { id: "in-2", title: "Stand up dedicated cold-calling desk", ownerId: "u-cso", quarter: "Q3", progress: 70, status: "on_track", keyResults: [{ text: "2 SDRs fully ramped", done: 2, target: 2 }, { text: "120 dials/day desk total", done: 0, target: 1 }, { text: "12 qualified meetings/mo", done: 0, target: 1 }] },
    { id: "in-3", title: "Cut post-production turnaround 20%", ownerId: "u-coo", quarter: "Q3", progress: 30, status: "at_risk", keyResults: [{ text: "New review pipeline live", done: 1, target: 1 }, { text: "Median edit cycle < 9 days", done: 0, target: 1 }] },
    { id: "in-4", title: "Open second studio bay", ownerId: "u-owner", quarter: "Q4", progress: 15, status: "planning", keyResults: [{ text: "Lease signed", done: 0, target: 1 }, { text: "Buildout budget approved", done: 0, target: 1 }] },
  ];
  const risks = [
    { id: "rk-1", title: "Beacon delivery slip past launch window", severity: "high", likelihood: "medium", ownerId: "u-coo", area: "Delivery", mitigation: "Final edit locked to this week; CO covers extra rounds; daily standup until delivery.", status: "open" },
    { id: "rk-2", title: "Client concentration — top 3 clients are 48% of revenue", severity: "high", likelihood: "high", ownerId: "u-cfo", area: "Financial", mitigation: "Pipeline diversification targets; no client above 25% by Q1 next year.", status: "open" },
    { id: "rk-3", title: "Inspire 3 down — single point of failure for heavy-lift aerials", severity: "medium", likelihood: "high", ownerId: "u-tech-head", area: "Operations", mitigation: "Repair approved path AP-5; rental bridge via Lensrentals for Summit.", status: "mitigating" },
    { id: "rk-4", title: "Key-person risk on color pipeline (single contractor)", severity: "medium", likelihood: "medium", ownerId: "u-cco", area: "People", mitigation: "Cross-train Chris on base grades; document LUT pipeline (SOP r-14).", status: "open" },
    { id: "rk-5", title: "AR aging — two invoices past 40 days", severity: "medium", likelihood: "high", ownerId: "u-cfo", area: "Financial", mitigation: "Dunning cadence active; late fees per contract after 45 days.", status: "mitigating" },
    { id: "rk-6", title: "Compliance rework on Bluebird eating margin", severity: "low", likelihood: "medium", ownerId: "u-coo", area: "Delivery", mitigation: "Pre-clear scripts with client legal before animation.", status: "open" },
  ];
  const boardNotes = [
    { id: "bn-1", title: "Q2 close summary", authorId: "u-ceo", ts: daysAgo(12), body: "Q2 closed at $412k revenue (+18% YoY), 31% gross margin. Retainer mix at 27%, targeting 35% by Q4. Cold desk fully staffed and producing 10–12 qualified meetings/month. Watch items: Beacon delivery risk, AR aging on two accounts, client concentration.", tags: ["quarterly"] },
    { id: "bn-2", title: "Studio expansion memo", authorId: "u-owner", ts: daysAgo(25), body: "Toured two candidate spaces for Bay 2. Eastside annex is the front-runner ($4.1k/mo, 2,800 sqft, existing cyc wall). Buildout est. $85k. Proposal to board in September; funded from operating cash if Q3 hits plan.", tags: ["expansion"] },
    { id: "bn-3", title: "Compensation review — sales desk", authorId: "u-cso", ts: daysAgo(40), body: "Recommend moving SDR comp to $48k base + $75/qualified meeting (from $50) with a 90-day floor, effective Q4. Models to +$310/mo per SDR at current set rates and improves retention vs. market.", tags: ["compensation"] },
  ];

  /* ============ NOTIFICATIONS (seed) ============ */
  const notifications = [
    { id: "n-1", userId: "u-ceo", kind: "approval", title: "Approval waiting: New hire — Editor II", body: "HR approved; your sign-off completes the offer for Marcus Doyle.", ts: daysAgo(2, 9), read: false, link: "#/approvals" },
    { id: "n-2", userId: "u-ceo", kind: "finance", title: "Invoice overdue 41 days — Beacon $42,000", body: "Milestone 2 invoice is past terms. Dunning notice sent.", ts: daysAgo(1, 8), read: false, link: "#/finance/invoices" },
    { id: "n-3", userId: "u-chris", kind: "task", title: "Due tomorrow: Episode 3 compliance revisions", body: "Legal flagged disclosure timing at 0:42.", ts: daysAgo(0, 8), read: false, link: "#/task/t-22" },
    { id: "n-4", userId: "u-jade", kind: "task", title: "Assigned: Final color pass on hero film", body: "Maya Johnson assigned you a task on OAK-2401.", ts: daysAgo(1, 10), read: true, link: "#/task/t-1" },
    { id: "n-5", userId: "u-zoe", kind: "sales", title: "Follow-up due: Caprock Credit Union", body: "Callback window opens today.", ts: daysAgo(0, 9), read: false, link: "#/sales/calls" },
    { id: "n-6", userId: "u-prod-head", kind: "approval", title: "Approval waiting: FX6 top handle kit — $3,849", body: "Submitted by Noah Park for the Redline shoot.", ts: daysAgo(2, 10), read: false, link: "#/approvals" },
    { id: "n-7", userId: "u-cfo", kind: "finance", title: "Payroll run scheduled in 6 days — $118,400", body: "Includes June commission payout. Review before Friday.", ts: daysAgo(1, 9), read: false, link: "#/finance/payroll" },
    { id: "n-8", userId: "u-maya", kind: "project", title: "OAK-2402 flagged at risk", body: "Weather delay on the Colorado unit. Re-book drone window.", ts: daysAgo(2, 15), read: true, link: "#/project/p-2" },
    { id: "n-9", userId: "u-hr-head", kind: "hr", title: "3 time-off requests pending", body: "Chris Turner, Noah Park, Emma Ruiz.", ts: daysAgo(1, 11), read: false, link: "#/hr" },
    { id: "n-10", userId: "u-coo", kind: "equipment", title: "Damage report DR-118 — Inspire 3", body: "Repair quote $4,850 routed for approval.", ts: daysAgo(4, 12), read: true, link: "#/equipment" },
  ];

  /* ============ AUDIT (seed) ============ */
  const ipFor = {};
  users.forEach((u, i) => { ipFor[u.id] = "10.4." + (2 + Math.floor(i / 8)) + "." + (11 + (i % 8) * 7); });
  const auditSeed = [
    ["u-ceo", "approve", "approval", "ap-9", "Approved promotion — Emma Ruiz to Designer II", 6],
    ["u-cfo", "approve", "approval", "ap-10", "Rejected expense — SXSW booth deposit ($2,500)", 11],
    ["u-rachel", "create", "invoice", "inv-drafts", "Drafted invoice — Juniper Q3 deposit $11,000", 1],
    ["u-daniel", "create", "document", "d-5", "Uploaded Change Order CO-118 draft (Beacon)", 1],
    ["u-noah", "create", "expense", "exp-pend", "Submitted expense — FX6 top handle kit $3,849", 2],
    ["u-tech-head", "edit", "equipment", "e-13", "Marked Inspire 3 as damaged (DR-118)", 11],
    ["u-hr-head", "edit", "resource", "r-3", "Published Employee Handbook v4.2", 30],
    ["u-sales-head", "assign", "lead", "l-22", "Assigned Caprock Credit Union to Zoe Adams", 8],
    ["u-maya", "edit", "project", "p-2", "Set project health to At Risk (weather delay)", 2],
    ["u-crea-head", "approve", "approval", "ap-8", "Approved lighting rental for Beacon pickups", 5],
    ["u-fin-head", "export", "invoice", "*", "Exported Q2 invoice register (CSV)", 14],
    ["u-owner", "view", "audit", "*", "Reviewed audit log", 3],
    ["u-hr-head", "create", "candidate", "cand-6", "Added candidate Kofi Mensah (SDR desk)", 5],
    ["u-coo", "manage", "permission", "u-jade", "Granted contractor access to Color Pipeline SOP", 20],
    ["u-zoe", "create", "comm", "*", "Logged 14 cold calls", 1],
  ];
  const audit = auditSeed.map((a, i) => ({
    id: "au-" + (i + 1), ts: daysAgo(a[5], between(8, 18), between(0, 59)),
    userId: a[0], role: (users.find(u => u.id === a[0]) || {}).role, dept: (users.find(u => u.id === a[0]) || {}).dept,
    action: a[1], entity: a[2], entityId: a[3], summary: a[4],
    prev: null, next: null, ip: ipFor[a[0]], ua: "Chrome 138 / macOS", reason: null, denied: false,
  }));

  OM.seed = () => ({
    version: 3,
    seededAt: now,
    users, clients, contacts, leads, projects, tasks, invoices, expenses, payroll,
    commissions, budgets, equipment, approvals, candidates, timeOff, reviews, hrActions,
    comms, meetings, resources, documents, initiatives, risks, boardNotes,
    notifications, audit, ipFor,
    counters: { inv: invNum, exp: expN, cm: cN, au: audit.length + 1, n: notifications.length + 1, generic: 1000 },
  });
})();
