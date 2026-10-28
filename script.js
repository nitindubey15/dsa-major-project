// =====================================================
// SMART TRAVEL COMPANION - script.js
// =====================================================

// DSA concepts: Trie (prefix search), Hash Map (destination lookup),
// weighted Graph + Dijkstra (shortest path), Stack (recent searches).
class TrieNode { constructor(){ this.children=Object.create(null); this.words=[]; } }
class DestinationTrie {
  constructor(items){ this.root=new TrieNode(); items.forEach(x=>this.insert(x)); }
  insert(item){ let n=this.root; for(const c of item.name.toLowerCase()){ if(!n.children[c]) n.children[c]=new TrieNode(); n=n.children[c]; n.words.push(item); } }
  searchPrefix(prefix){ let n=this.root; for(const c of prefix.toLowerCase()){ if(!n.children[c]) return []; n=n.children[c]; } return [...new Map(n.words.map(x=>[x.name,x])).values()]; }
}
let destinationTrie;
let destinationByName=new Map();
const recentDestinationStack=[];
const MAX_RECENT_DESTINATIONS=5;
// Sample weighted adjacency-list graph; these distances are illustrative only.
const routeGraph={
 "Raipur":{"Bhilai":35,"Durg":40,"Jagdalpur":280,"Mainpat":220},
 "Bhilai":{"Raipur":35,"Durg":10},
 "Durg":{"Raipur":40,"Bhilai":10,"Jagdalpur":275},
 "Jagdalpur":{"Raipur":280,"Durg":275,"Amarkantak":390},
 "Mainpat":{"Raipur":220,"Amarkantak":250},
 "Amarkantak":{"Mainpat":250,"Jagdalpur":390}
};
function initializeDSA(){
 if(typeof destinations==="undefined") return;
 destinationTrie=new DestinationTrie(destinations);
 destinationByName=new Map(destinations.map(x=>[x.name.toLowerCase(),x]));
 renderRecentSearches();
}
function escapeHTML(value){
 return String(value).replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
}
// Dijkstra using linear minimum-distance selection: O(V^2 + E).
function dijkstra(graph,start,target){
 const nodes=Object.keys(graph); if(!graph[start]||!graph[target]) return null;
 const dist=Object.fromEntries(nodes.map(n=>[n,Infinity])), prev={}, unvisited=new Set(nodes); dist[start]=0;
 while(unvisited.size){
  let current=null; for(const n of unvisited) if(current===null||dist[n]<dist[current]) current=n;
  if(current===null||dist[current]===Infinity) break; if(current===target) break; unvisited.delete(current);
  for(const [next,w] of Object.entries(graph[current])){ if(!unvisited.has(next)) continue; const candidate=dist[current]+w; if(candidate<dist[next]){dist[next]=candidate;prev[next]=current;} }
 }
 if(dist[target]===Infinity) return null;
 const path=[]; let cursor=target; while(cursor){path.unshift(cursor);if(cursor===start)break;cursor=prev[cursor];}
 return {path,distance:dist[target]};
}
async function findShortestRoute(){
 const from=document.getElementById("routeFrom")?.value;
 const to=document.getElementById("routeTo")?.value;
 const out=document.getElementById("routeResult");
 if(!out)return;
 if(from===to){out.textContent="Choose two different places to calculate a route.";return;}
 out.textContent="Calculating route…";
 try {
  const response=await fetch("/api/routes/shortest",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({from,to})});
  const data=await response.json();
  if(!response.ok) throw new Error(data.error||"Could not calculate route.");
  out.innerHTML=`<strong>${data.path.map(escapeHTML).join(" → ")}</strong><span>Estimated sample distance: ${data.distanceKm} km</span><small>Computed by the backend using Dijkstra's shortest-path algorithm. Sample distances only; not live navigation.</small>`;
 } catch(error) {
  // Keep the project usable if the frontend is opened without starting the backend.
  const r=dijkstra(routeGraph,from,to);
  if(r) out.innerHTML=`<strong>${r.path.map(escapeHTML).join(" → ")}</strong><span>Estimated sample distance: ${r.distance} km</span><small>Backend unavailable; using the frontend sample graph.</small>`;
  else out.textContent=error.message||"Backend unavailable. Start the server with npm start.";
 }
}
function pushRecentDestination(item){
 if(!item)return;
 const i=recentDestinationStack.lastIndexOf(item.name); if(i!==-1)recentDestinationStack.splice(i,1);
 recentDestinationStack.push(item.name); if(recentDestinationStack.length>MAX_RECENT_DESTINATIONS)recentDestinationStack.shift(); renderRecentSearches();
 fetch("/api/search-history",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${sessionStorage.getItem("solvixToken")||""}`},body:JSON.stringify({destination:item.name})}).catch(()=>{});
}
function renderRecentSearches(){
 const box=document.getElementById("recentSearches"); if(!box)return;
 if(!recentDestinationStack.length){box.textContent="No searches yet.";return;}
 box.innerHTML=""; [...recentDestinationStack].reverse().forEach(name=>{const chip=document.createElement("span");chip.className="dsa-recent-chip";chip.textContent=name;box.appendChild(chip);});
}




// ================= LOGIN =================

function openLogin() {
  const loginScreen = document.getElementById("loginScreen");
  const dashboardScreen = document.getElementById("dashboardScreen");

  if (loginScreen) {
    loginScreen.classList.add("active");
  }

  if (dashboardScreen) {
    dashboardScreen.classList.remove("active");
  }
}


async function handleLogin(event) {
  event.preventDefault();
  const emailInput=document.querySelector('.auth-form input[type="email"]');
  const passwordInput=document.querySelector('.auth-form input[type="password"]');
  if(!emailInput||!passwordInput){alert("Login form error.");return;}
  const email=emailInput.value.trim();
  const password=passwordInput.value;
  if(!email||!password){alert("Please fill all the details.");return;}
  const submitButton=document.querySelector('.auth-form button[type="submit"]');
  if(submitButton){submitButton.disabled=true;submitButton.dataset.originalText=submitButton.textContent;submitButton.textContent="Signing in…";}
  try {
    const response=await fetch("http://localhost:3000/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
    const data=await response.json();
    if(!response.ok) throw new Error(data.error||"Login failed.");
    sessionStorage.setItem("solvixToken",data.token);
    sessionStorage.setItem("solvixUser",JSON.stringify(data.user));
    openHome();
  } catch(error) {
    alert(`${error.message}

Demo login: explorer@sih.gov.in / password123
Start the backend using npm install, then npm start.`);
  } finally {
    if(submitButton){submitButton.disabled=false;submitButton.textContent=submitButton.dataset.originalText||"Sign in";}
  }
}


// ================= HOME / DASHBOARD =================

function openHome() {
  const loginScreen = document.getElementById("loginScreen");
  const dashboardScreen = document.getElementById("dashboardScreen");

  if (loginScreen) {
    loginScreen.classList.remove("active");
  }

  if (dashboardScreen) {
    dashboardScreen.classList.add("active");
  }
}


// ================= LIVE LOCATION =================

function toggleLocationSwitch() {
  const switchButton = document.getElementById("locationSwitch");
  const switchStatus = document.getElementById("switchStatus");

  if (!switchButton || !switchStatus) {
    return;
  }

  const isOn = switchStatus.textContent.trim() === "ON";

  if (isOn) {
    switchStatus.textContent = "OFF";
    switchButton.classList.remove("active");
  } else {
    switchStatus.textContent = "ON";
    switchButton.classList.add("active");
  }
}


// ================= BOOKINGS =================

function openBookings() {
  const bookingModal = document.getElementById("bookingModal");

  if (bookingModal) {
    bookingModal.classList.add("active");
  }

  // Set today's date as minimum travel date
  const dateInput = document.getElementById("bookingDate");

  if (dateInput) {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    const formattedDate = `${year}-${month}-${day}`;

    dateInput.min = formattedDate;

    if (!dateInput.value) {
      dateInput.value = formattedDate;
    }
  }
}


function closeBookings() {
  const bookingModal = document.getElementById("bookingModal");

  if (bookingModal) {
    bookingModal.classList.remove("active");
  }
}


let selectedBookingService = "Train";


function selectBookingService(button) {
  const serviceButtons = document.querySelectorAll(
    ".booking-service-card"
  );

  serviceButtons.forEach(function (item) {
    item.classList.remove("selected");
  });

  if (button) {
    button.classList.add("selected");
    selectedBookingService =
      button.getAttribute("data-service") || "Train";
  }
}


async function searchBookings(event) {
  event.preventDefault();
  const fromInput=document.getElementById("bookingFrom");
  const toInput=document.getElementById("bookingTo");
  const dateInput=document.getElementById("bookingDate");
  const travellersInput=document.getElementById("bookingTravellers");
  const result=document.getElementById("bookingResult");
  if(!fromInput||!toInput||!dateInput||!travellersInput||!result)return;
  const from=fromInput.value.trim(), to=toInput.value.trim(), date=dateInput.value, travellers=Number(travellersInput.value);
  if(!from||!to||!date){alert("Please fill all the booking details.");return;}
  if(from.toLowerCase()===to.toLowerCase()){alert("From and destination must be different.");return;}
  result.innerHTML="<div class=\"booking-result-content\"><strong>Saving your request…</strong></div>";
  result.classList.add("show");
  try {
    const response=await fetch("/api/bookings",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${sessionStorage.getItem("solvixToken")||""}`},body:JSON.stringify({service:selectedBookingService,from,to,date,travellers})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Could not save booking request.");
    result.innerHTML=`<div class="booking-result-content"><strong>${escapeHTML(selectedBookingService)} request saved</strong><p>${escapeHTML(from)} → ${escapeHTML(to)}</p><small>${escapeHTML(date)} • ${travellers} traveller(s) • Request ID: ${escapeHTML(data.booking.id)}</small><p><small>This is a saved travel request, not a confirmed ticket.</small></p></div>`;
  } catch(error) {
    result.innerHTML=`<div class="booking-result-content"><strong>Backend unavailable</strong><p>${escapeHTML(error.message)}</p><small>Start SOLVIX with npm start and try again.</small></div>`;
  }
}


// =====================================================
// DESTINATION SEARCH
// =====================================================

const destinations = [
  {
    name: "Raipur",
    type: "City",
    icon: "ph-buildings"
  },
  {
    name: "Bhilai",
    type: "City",
    icon: "ph-buildings"
  },
  {
    name: "Durg",
    type: "City",
    icon: "ph-buildings"
  },
  {
    name: "Jagdalpur",
    type: "City",
    icon: "ph-map-pin"
  },
  {
    name: "Chitrakote Falls",
    type: "Tourist Place",
    icon: "ph-waves"
  },
  {
    name: "Bamleshwari Temple",
    type: "Temple",
    icon: "ph-bank"
  },
  {
    name: "Tirathgarh Waterfalls",
    type: "Tourist Place",
    icon: "ph-waves"
  },
  {
    name: "Barnawapara Wildlife Sanctuary",
    type: "Wildlife",
    icon: "ph-tree"
  },
  {
    name: "Mainpat",
    type: "Hill Station",
    icon: "ph-mountains"
  },
  {
    name: "Amarkantak",
    type: "Tourist Place",
    icon: "ph-mountains"
  },
  {
    name: "Delhi",
    type: "City",
    icon: "ph-buildings"
  },
  {
    name: "Mumbai",
    type: "City",
    icon: "ph-buildings"
  },
  {
    name: "Goa",
    type: "Beach Destination",
    icon: "ph-waves"
  },
  {
    name: "Jaipur",
    type: "City",
    icon: "ph-buildings"
  },
  {
    name: "Manali",
    type: "Hill Station",
    icon: "ph-mountains"
  },
  {
    name: "Kashmir",
    type: "Tourist Destination",
    icon: "ph-mountains"
  }
];


function toggleDestinationSearch() {
  const panel = document.getElementById(
    "destinationSearchPanel"
  );

  const input = document.getElementById(
    "destinationSearchInput"
  );

  if (!panel) {
    return;
  }

  const isOpen = panel.classList.contains("active");

  if (isOpen) {
    closeDestinationSearch();
  } else {
    panel.classList.add("active");

    if (input) {
      setTimeout(function () {
        input.focus();
      }, 100);
    }

    showAllDestinations();
  }
}


function closeDestinationSearch() {
  const panel = document.getElementById(
    "destinationSearchPanel"
  );

  const input = document.getElementById(
    "destinationSearchInput"
  );

  const results = document.getElementById(
    "destinationSearchResults"
  );

  if (panel) {
    panel.classList.remove("active");
  }

  if (input) {
    input.value = "";
  }

  if (results) {
    results.innerHTML = `
      <div class="destination-search-hint">
        <i class="ph-fill ph-map-pin"></i>
        <span>
          Search for a city, destination or tourist place
        </span>
      </div>
    `;
  }
}


function showAllDestinations() {
  const results = document.getElementById(
    "destinationSearchResults"
  );

  if (!results) {
    return;
  }

  results.innerHTML = "";

  destinations.slice(0, 6).forEach(function (destination) {
    const item = createDestinationResult(destination);
    results.appendChild(item);
  });
}


function searchDestinations() {
  const input=document.getElementById("destinationSearchInput");
  const results=document.getElementById("destinationSearchResults");
  if(!input||!results)return;
  const q=input.value.trim().toLowerCase();
  if(!q){showAllDestinations();return;}
  const prefix=destinationTrie?destinationTrie.searchPrefix(q):[];
  const extra=destinations.filter(x=>x.type.toLowerCase().includes(q)||x.name.toLowerCase().includes(q));
  const matches=[...new Map([...prefix,...extra].map(x=>[x.name,x])).values()];
  results.innerHTML="";
  if(!matches.length){results.innerHTML=`<div class="destination-no-result"><i class="ph-bold ph-map-pin"></i><strong>No destination found</strong><span>Try another city or place</span></div>`;return;}
  matches.forEach(x=>results.appendChild(createDestinationResult(x)));
}

function createDestinationResult(destination) {
  const item = document.createElement("button");

  item.type = "button";
  item.className = "destination-result-item";

  item.innerHTML = `
    <div class="destination-result-icon">
      <i class="ph-fill ${destination.icon}"></i>
    </div>

    <div class="destination-result-info">
      <strong>${destination.name}</strong>
      <span>${destination.type}</span>
    </div>

    <i class="ph-bold ph-caret-right destination-result-arrow"></i>
  `;

  item.addEventListener("click", function () {
    selectDestination(destination);
  });

  return item;
}


function selectDestination(destination) {
  if (!destination) {
    return;
  }

  const input = document.getElementById(
    "destinationSearchInput"
  );

  if (input) {
    input.value = destination.name;
  }

  pushRecentDestination(destination);

  // Put selected destination into the booking "To" field
  const bookingTo = document.getElementById("bookingTo");

  if (bookingTo) {
    bookingTo.value = destination.name;
  }

  closeDestinationSearch();

  // Show selected destination
  alert(`Destination selected: ${destination.name}`);
}


function handleDestinationSearchKey(event) {
  if (event.key === "Escape") {
    closeDestinationSearch();
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();

    const input = document.getElementById(
      "destinationSearchInput"
    );

    if (!input) {
      return;
    }

    const searchText = input.value
      .trim()
      .toLowerCase();

    if (!searchText) {
      return;
    }

    const destination = destinationByName.get(searchText) || destinations.find(item => item.name.toLowerCase().includes(searchText));

    if (destination) {
      selectDestination(destination);
    }
  }
}


// ================= GLOBAL KEYBOARD EVENTS =================

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeDestinationSearch();
    closeBookings();
  }
});


// ================= CLICK OUTSIDE SEARCH =================

document.addEventListener("click", function (event) {
  const panel = document.getElementById(
    "destinationSearchPanel"
  );

  const searchButton = document.querySelector(
    ".destination-search-btn"
  );

  if (!panel || !panel.classList.contains("active")) {
    return;
  }

  if (
    panel.contains(event.target) ||
    (searchButton && searchButton.contains(event.target))
  ) {
    return;
  }

  closeDestinationSearch();
});


// ================= INITIAL SETUP =================

document.addEventListener("DOMContentLoaded", function () {
  initializeDSA();
  // Set today's date for booking
  const dateInput = document.getElementById("bookingDate");

  if (dateInput) {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    dateInput.min = `${year}-${month}-${day}`;
  }

  // Make sure login screen is initially visible
  const loginScreen = document.getElementById("loginScreen");
  const dashboardScreen =
    document.getElementById("dashboardScreen");

  if (loginScreen && dashboardScreen) {
    loginScreen.classList.add("active");
    dashboardScreen.classList.remove("active");
  }
});