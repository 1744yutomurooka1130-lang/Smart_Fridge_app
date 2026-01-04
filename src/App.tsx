import React, { useState, useEffect, useMemo } from 'react';
import { Camera, Search, Plus, Calendar, ChefHat, ShoppingCart, AlertTriangle, Check, Trash2, LayoutDashboard, Refrigerator, Snowflake, Sun, Share2, IceCream, Carrot, Settings, Edit3, ArrowUpDown, X, CheckSquare, Square, Minus, MessageSquare, History, ChevronLeft, Clock, TrendingDown, AlertOctagon, Ban, Save, FileText, Loader2, Sparkles } from 'lucide-react';
import Tesseract from 'tesseract.js';

// --- 型定義 ---
type StorageType='refrigerator'|'freezer_main'|'freezer_sub'|'vegetable'|'ambient';
type ItemCategory='dairy'|'egg'|'vegetable'|'fruit'|'meat'|'fish'|'other';
type FilterMode='all'|'expired'|'near'|'lowStock';
interface FoodItem{id:string;name:string;storage:StorageType;category:ItemCategory;categorySmall:string;location:string;expiryDate:string;quantity:number;unit:string;addedDate:string;emoji:string;}
interface ShoppingItem{id:string;name:string;quantity:number;unit:string;isChecked:boolean;addedDate:string;}
interface RecipeMaterial{name:string;amount:number|string;unit:string;}
interface Recipe{id:string;title:string;time:string;ingredients:RecipeMaterial[];missing:RecipeMaterial[];desc:string;steps?:string[];mode:'auto'|'custom';createdAt:string;userRequest?:string;allMaterials:RecipeMaterial[];}
interface ScannedItem extends FoodItem { isSelected: boolean; }

// --- 定数 ---
const GEMINI_MODEL="gemini-3-flash-preview"; 

// --- ヘルパー ---
const formatAmountStr=(a:number|string,u:string)=>{const n=['少々','適量','お好みで','ひとつまみ','適宜'];return n.includes(u)?u:`${a}${u}`;};
const fileToBase64=(f:File):Promise<string>=>new Promise((r,j)=>{const d=new FileReader();d.readAsDataURL(f);d.onload=()=>r((d.result as string).split(',')[1]);d.onerror=j;});
const loadFromStorage=<T,>(k:string,v:T):T=>{try{const i=window.localStorage.getItem(k);return i?JSON.parse(i):v;}catch{return v;}};
const callGeminiWithRetry=async(k:string,p:any,r=3,d=2000):Promise<any>=>{const u=`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${k}`;for(let i=0;i<=r;i++){try{const res=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});if(res.ok)return await res.json();if((res.status===429||res.status===503)&&i<r){await new Promise(x=>setTimeout(x,d));d*=2;continue;}throw new Error(`API Error:${res.status}`);}catch(e){if(i===r)throw e;await new Promise(x=>setTimeout(x,d));d*=2;}}};

// --- データ (圧縮) ---
const INITIAL_ITEMS:FoodItem[]=[{id:'1',name:'牛乳',storage:'refrigerator',category:'dairy',categorySmall:'牛乳',location:'ドアポケット',expiryDate:new Date(Date.now()+172800000).toISOString().split('T')[0],quantity:1,unit:'本',addedDate:'2023-10-25',emoji:'🥛'},{id:'2',name:'卵',storage:'refrigerator',category:'egg',categorySmall:'卵',location:'上段',expiryDate:new Date(Date.now()+432000000).toISOString().split('T')[0],quantity:2,unit:'個',addedDate:'2023-10-20',emoji:'🥚'},{id:'3',name:'豚バラ肉',storage:'freezer_main',category:'meat',categorySmall:'豚肉',location:'上段トレー',expiryDate:new Date(Date.now()+1728000000).toISOString().split('T')[0],quantity:200,unit:'g',addedDate:'2023-10-15',emoji:'🥩'}];
const INITIAL_SHOPPING_LIST:ShoppingItem[]=[{id:'s1',name:'醤油',quantity:1,unit:'本',isChecked:false,addedDate:'2023-10-25'}];
const INITIAL_UNIT_OPTIONS=['個','本','g','kg','ml','L','パック','玉','袋','束','枚','切れ','缶','瓶','箱','少々','適量'];
const EMOJI_KEYWORDS:Record<string,string>={'牛':'🥩','豚':'🥩','鶏':'🍗','肉':'🥩','魚':'🐟','鮭':'🐟','鯖':'🐟','海老':'🦐','牛乳':'🥛','卵':'🥚','キャベツ':'🥬','レタス':'🥬','トマト':'🍅','人参':'🥕','玉ねぎ':'🧅','りんご':'🍎','みかん':'🍊','バナナ':'🍌','パン':'🍞','うどん':'🍜','カレー':'🍛','アイス':'🍨','チョコ':'🍫','酒':'🍶','ビール':'🍺','豆腐':'🧊','納豆':'🥢'};
const EMOJI_LIBRARY:Record<string,string[]>={'野菜・果物':['🥦','🥬','🥒','🌽','🥕','🥔','🍅','🍆','🧅','🍎','🍊','🍌','🍇','🍓','🍑','🍍','🥝'],'肉・魚・卵':['🥩','🍗','🥓','🍖','🍔','🐟','🐠','🦐','🦀','🦑','🍣','🥚','🍳'],'乳製品・飲料':['🥛','🧀','🧈','🍦','🍵','☕','🧃','🥤','🍺','🍷'],'穀物・麺類':['🍚','🍙','🍜','🍝','🍞','🥐','🥪','🍕'],'その他':['🍱','🥫','🥢','🍫','🍬','🍮','🧂','🥡']};
const CATEGORY_LABELS:Record<string,string>={dairy:'🥛 乳製品',egg:'🥚 卵',meat:'🥩 肉類',fish:'🐟 魚介',vegetable:'🥦 野菜',fruit:'🍎 果物',other:'🥫 その他'};
const INITIAL_CATEGORY_OPTIONS:Record<ItemCategory,string[]>={dairy:['牛乳','ヨーグルト','チーズ'],egg:['卵'],meat:['豚肉','牛肉','鶏肉','ハム'],fish:['鮭','サバ'],vegetable:['キャベツ','人参','玉ねぎ','トマト'],fruit:['りんご','バナナ','みかん'],other:['豆腐','納豆']};
const INITIAL_LOCATION_OPTIONS:Record<StorageType,string[]>={refrigerator:['ドアポケット','上段','中段'],freezer_main:['上段','下段'],freezer_sub:['製氷室横'],vegetable:['上段','下段'],ambient:['棚','カゴ']};
const DEFAULT_EXPIRY_DAYS:Record<string,number>={'牛乳':7,'卵':14,'納豆':10,'豚肉':3,'牛肉':3,'鶏肉':2,'キャベツ':7,'レタス':4,'トマト':5,'玉ねぎ':30,'りんご':14};
const DEFAULT_STOCK_THRESHOLDS:Record<string,number>={'卵':3,'牛乳':1,'納豆':1};

// --- アプリ本体 ---
export default function App() {
  const [activeTab,setActiveTab]=useState<'dashboard'|'inventory'|'add'|'recipes'|'shopping'|'settings'>('dashboard');
  const [items,setItems]=useState<FoodItem[]>(()=>loadFromStorage('sf_items',INITIAL_ITEMS));
  const [shoppingList,setShoppingList]=useState<ShoppingItem[]>(()=>loadFromStorage('sf_shoppingList',INITIAL_SHOPPING_LIST));
  const [recipeHistory,setRecipeHistory]=useState<Recipe[]>(()=>loadFromStorage('sf_recipeHistory',[]));
  const [geminiApiKey,setGeminiApiKey]=useState<string>('');
  const [categoryOptions,setCategoryOptions]=useState(()=>loadFromStorage('sf_categoryOptions',INITIAL_CATEGORY_OPTIONS));
  const [locationOptions,setLocationOptions]=useState(()=>loadFromStorage('sf_locationOptions',INITIAL_LOCATION_OPTIONS));
  const [unitOptions,setUnitOptions]=useState<string[]>(()=>loadFromStorage('sf_unitOptions',INITIAL_UNIT_OPTIONS));
  const [expirySettings,setExpirySettings]=useState<Record<string,number>>(()=>loadFromStorage('sf_expirySettings',DEFAULT_EXPIRY_DAYS));
  const [stockThresholds,setStockThresholds]=useState<Record<string,number>>(()=>loadFromStorage('sf_stockThresholds',DEFAULT_STOCK_THRESHOLDS));
  const [emojiHistory,setEmojiHistory]=useState<Record<string,string>>(()=>loadFromStorage('sf_emojiHistory',{}));
  const [editingItem,setEditingItem]=useState<FoodItem|null>(null);
  const [inventoryFilterMode,setInventoryFilterMode]=useState<FilterMode>('all');
  const [showScannerModal,setShowScannerModal]=useState(false);
  const [notification,setNotification]=useState<string|null>(null);

  useEffect(()=>{localStorage.setItem('sf_items',JSON.stringify(items));},[items]);
  useEffect(()=>{localStorage.setItem('sf_shoppingList',JSON.stringify(shoppingList));},[shoppingList]);
  useEffect(()=>{localStorage.setItem('sf_recipeHistory',JSON.stringify(recipeHistory));},[recipeHistory]);
  useEffect(()=>{localStorage.setItem('sf_categoryOptions',JSON.stringify(categoryOptions));},[categoryOptions]);
  useEffect(()=>{localStorage.setItem('sf_locationOptions',JSON.stringify(locationOptions));},[locationOptions]);
  useEffect(()=>{localStorage.setItem('sf_unitOptions',JSON.stringify(unitOptions));},[unitOptions]);
  useEffect(()=>{localStorage.setItem('sf_expirySettings',JSON.stringify(expirySettings));},[expirySettings]);
  useEffect(()=>{localStorage.setItem('sf_stockThresholds',JSON.stringify(stockThresholds));},[stockThresholds]);
  useEffect(()=>{localStorage.setItem('sf_emojiHistory',JSON.stringify(emojiHistory));},[emojiHistory]);
  useEffect(()=>{const k=localStorage.getItem('GEMINI_API_KEY');if(k)setGeminiApiKey(k);},[]);

  const saveApiKey=(k:string)=>{setGeminiApiKey(k);localStorage.setItem('GEMINI_API_KEY',k);showToast('APIキー保存完了');};
  const showToast=(m:string)=>{setNotification(m);setTimeout(()=>setNotification(null),3000);};
  const addCategoryOption=(c:ItemCategory,n:string)=>{setCategoryOptions((p:any)=>{const cur=p[c]||[];return!cur.includes(n)?{...p,[c]:[...cur,n]}:p;});};
  const addLocationOption=(s:StorageType,n:string)=>{setLocationOptions((p:any)=>{const cur=p[s]||[];return!cur.includes(n)?{...p,[s]:[...cur,n]}:p;});};
  const addUnitOption=(u:string)=>{setUnitOptions(p=>!p.includes(u)?[...p,u]:p);};
  const updateEmojiHistory=(n:string,e:string)=>{setEmojiHistory(p=>({...p,[n]:e}));};
  const addRecipeToHistory=(r:Recipe)=>{setRecipeHistory(p=>[r,...p]);};
  const updateItem=(u:FoodItem)=>{setItems(p=>p.map(i=>i.id===u.id?u:i));showToast(`${u.name} を更新しました`);};
  const deleteItem=(id:string)=>{setItems(items.filter(i=>i.id!==id));showToast('削除しました');};
  const addToShoppingList=(n:string,q=1,u='個')=>{setShoppingList(p=>{if(p.some(i=>i.name===n)){showToast('既にリストにあります');return p;}return[...p,{id:Date.now().toString(),name:n,quantity:q,unit:u,isChecked:false,addedDate:new Date().toISOString().split('T')[0]}]});showToast('リストに追加しました');};
  const toggleShoppingItem=(id:string)=>{setShoppingList(p=>p.map(i=>i.id===id?{...i,isChecked:!i.isChecked}:i));};
  const deleteShoppingItem=(id:string)=>{setShoppingList(p=>p.filter(i=>i.id!==id));};
  const updateShoppingItemQuantity=(id:string,d:number)=>{setShoppingList(p=>p.map(i=>i.id===id?{...i,quantity:Math.max(1,i.quantity+d)}:i));};

  const lowStockItems=useMemo(()=>{const g:Record<string,number>={};items.forEach(i=>{const k=i.categorySmall||i.name;g[k]=(g[k]||0)+i.quantity;});const l:string[]=[];Object.keys(stockThresholds).forEach(k=>{if((g[k]||0)<stockThresholds[k])l.push(k);});return l;},[items,stockThresholds]);
  const statusCounts=useMemo(()=>{const t=new Date().toISOString().split('T')[0];const d3=new Date(Date.now()+259200000).toISOString().split('T')[0];let e=0,w=0;items.forEach(i=>{if(i.expiryDate<t)e++;else if(i.expiryDate<=d3)w++;});return{expired:e,warning:w,total:items.length,lowStock:lowStockItems.length};},[items,lowStockItems]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-20 md:pb-0 md:pl-64">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} counts={statusCounts} />
      <main className="p-4 max-w-4xl mx-auto">
        <Header activeTab={activeTab} setShowScannerModal={setShowScannerModal} />
        {notification && <div className="fixed top-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-down">{notification}</div>}
        {activeTab==='dashboard'&&<Dashboard items={items} counts={statusCounts} setActiveTab={setActiveTab} setInventoryFilterMode={setInventoryFilterMode}/>}
        {activeTab==='inventory'&&<InventoryList items={items} deleteItem={deleteItem} onAddToShoppingList={addToShoppingList} lowStockItems={lowStockItems} stockThresholds={stockThresholds} inventoryFilterMode={inventoryFilterMode} setInventoryFilterMode={setInventoryFilterMode} onEdit={setEditingItem}/>}
        {activeTab==='add'&&<AddItemForm categoryOptions={categoryOptions} addCategoryOption={addCategoryOption} locationOptions={locationOptions} addLocationOption={addLocationOption} unitOptions={unitOptions} addUnitOption={addUnitOption} expirySettings={expirySettings} emojiHistory={emojiHistory} updateEmojiHistory={updateEmojiHistory} onAdd={(n:FoodItem)=>{setItems([...items,n]);showToast('追加しました');setActiveTab('inventory');}} onCancel={()=>setActiveTab('dashboard')}/>}
        {activeTab==='recipes'&&<RecipeGenerator items={items} onAddToShoppingList={addToShoppingList} history={recipeHistory} onAddHistory={addRecipeToHistory} apiKey={geminiApiKey}/>}
        {activeTab==='shopping'&&<ShoppingList items={shoppingList} onToggle={toggleShoppingItem} onDelete={deleteShoppingItem} onAdd={addToShoppingList} onUpdateQuantity={updateShoppingItemQuantity} onExport={()=>{console.log(shoppingList);showToast('出力しました(Demo)');}} unitOptions={unitOptions} addUnitOption={addUnitOption}/>}
        {activeTab==='settings'&&<SettingsScreen categoryOptions={categoryOptions} expirySettings={expirySettings} setExpirySettings={setExpirySettings} stockThresholds={stockThresholds} setStockThresholds={setStockThresholds} showToast={showToast} apiKey={geminiApiKey} saveApiKey={saveApiKey}/>}
      </main>
      {showScannerModal&&<ScannerModal onClose={()=>setShowScannerModal(false)} onScan={(s:FoodItem[])=>{setItems([...items,...s]);setShowScannerModal(false);showToast(`${s.length}件追加しました`);}} apiKey={geminiApiKey} categoryOptions={categoryOptions} addCategoryOption={addCategoryOption} locationOptions={locationOptions} addLocationOption={addLocationOption} emojiHistory={emojiHistory} expirySettings={expirySettings}/>}
      {editingItem&&<EditItemModal item={editingItem} onClose={()=>setEditingItem(null)} onSave={(u:FoodItem)=>{updateItem(u);setEditingItem(null);}} categoryOptions={categoryOptions} locationOptions={locationOptions} unitOptions={unitOptions}/>}
    </div>
  );
}

// --- Components ---
function Navigation({ activeTab, setActiveTab, counts }: any) {
  const tabs=[{id:'dashboard',icon:LayoutDashboard,label:'ホーム'},{id:'inventory',icon:Refrigerator,label:'冷蔵庫'},{id:'add',icon:Plus,label:'追加',isAction:true},{id:'recipes',icon:ChefHat,label:'レシピ'},{id:'shopping',icon:ShoppingCart,label:'買い物'},{id:'settings',icon:Settings,label:'設定'}];
  return (
    <>
      <div className="hidden md:flex flex-col w-64 bg-white h-screen fixed left-0 top-0 border-r border-gray-200 shadow-sm z-10">
        <div className="p-6"><h1 className="text-2xl font-bold text-green-600 flex items-center gap-2"><Refrigerator className="w-8 h-8" />SmartFridge</h1></div>
        <nav className="flex-1 px-4 space-y-2">{tabs.map(t=><button key={t.id} onClick={()=>setActiveTab(t.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab===t.id?'bg-green-100 text-green-700 font-semibold':'text-gray-500 hover:bg-gray-100'}`}><div className="relative"><t.icon className="w-6 h-6"/>{t.id==='inventory'&&(counts.expired>0?<span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"/>:counts.lowStock>0?<span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"/>:null)}</div>{t.label}</button>)}</nav>
      </div>
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-40 px-2 py-2 flex justify-between items-center shadow-lg safe-area-bottom">{tabs.map(t=><button key={t.id} onClick={()=>setActiveTab(t.id)} className={`flex flex-col items-center justify-center w-full p-2 rounded-lg ${activeTab===t.id?'text-green-600':'text-gray-400'}`}>{t.isAction?<div className="bg-green-500 text-white p-3 rounded-full shadow-md -translate-y-4"><Plus className="w-6 h-6"/></div>:<><div className="relative"><t.icon className="w-6 h-6 mb-1"/>{t.id==='inventory'&&(counts.expired>0?<span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"/>:counts.lowStock>0?<span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full"/>:null)}</div><span className="text-[10px] font-medium">{t.label}</span></>}</button>)}</div>
    </>
  );
}

function Header({ activeTab, setShowScannerModal }: any) {
  const titles:any={dashboard:'ダッシュボード',inventory:'在庫管理',add:'食品の追加',recipes:'AIレシピ提案',shopping:'買い物リスト',settings:'設定'};
  return <header className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-800">{titles[activeTab]}</h2>{activeTab!=='settings'&&(<div className="flex gap-2"><button className="p-2 bg-white rounded-full shadow-sm border border-gray-200 text-gray-600"><Search className="w-5 h-5"/></button><button onClick={()=>setShowScannerModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 transition-colors"><Camera className="w-4 h-4"/><span className="hidden sm:inline">レシート読取</span></button></div>)}</header>;
}

function Dashboard({ items, counts, setActiveTab, setInventoryFilterMode }: any) {
  const dates=Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return{iso:d.toISOString().split('T')[0],day:d.toLocaleDateString('ja-JP',{weekday:'short'}),date:d.getDate()};});
  const handleCardClick=(f:FilterMode)=>{setInventoryFilterMode(f);setActiveTab('inventory');};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3">
        <button onClick={()=>handleCardClick('all')} className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-4"><span className="text-2xl font-bold text-gray-800">{counts.total}</span><span className="text-[10px] text-gray-500 mt-1">全アイテム</span></button>
        <button onClick={()=>handleCardClick('expired')} className="bg-red-50 p-2 rounded-2xl border border-red-100 flex flex-col items-center justify-center py-4"><span className="text-2xl font-bold text-red-600">{counts.expired}</span><span className="text-[10px] text-red-500 font-semibold">期限切れ</span></button>
        <button onClick={()=>handleCardClick('near')} className="bg-yellow-50 p-2 rounded-2xl border border-yellow-100 flex flex-col items-center justify-center py-4"><span className="text-2xl font-bold text-yellow-600">{counts.warning}</span><span className="text-[10px] text-yellow-600 font-semibold">期限間近</span></button>
        <button onClick={()=>handleCardClick('lowStock')} className="bg-blue-50 p-2 rounded-2xl border border-blue-100 flex flex-col items-center justify-center py-4"><span className="text-2xl font-bold text-blue-600">{counts.lowStock}</span><span className="text-[10px] text-blue-600 font-semibold">在庫不足</span></button>
      </div>
      {counts.expired>0&&<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"/><div><h3 className="font-bold text-red-700">期限切れがあります</h3><button onClick={()=>handleCardClick('expired')} className="mt-1 text-sm font-semibold text-red-700 underline">確認する</button></div></div>}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100"><h3 className="font-bold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-gray-500"/>期限カレンダー</h3><div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar">{dates.map((d,i)=>{const c=items.filter((x:any)=>x.expiryDate===d.iso).length;return(<div key={d.iso} className={`flex-shrink-0 w-14 h-24 rounded-full flex flex-col items-center justify-between py-3 border ${i===0?'border-green-500 bg-green-50':'border-gray-100 bg-white'}`}><span className="text-xs text-gray-400">{d.day}</span><span className="text-lg font-bold text-gray-700">{d.date}</span><div className="h-6 flex items-center justify-center">{c>0?<div className="w-5 h-5 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-[10px] font-bold">{c}</div>:<div className="w-1.5 h-1.5 rounded-full bg-gray-200"/>}</div></div>);})}</div></div>
    </div>
  );
}

const ItemCard = ({ item, deleteItem, onAddToShoppingList, isLowStock, threshold, onEdit }: any) => {
  const getStatusColor = (d: string, l: boolean, q: number) => {
    const t=new Date().toISOString().split('T')[0]; const d3=new Date(Date.now()+259200000).toISOString().split('T')[0];
    if(q===0)return'bg-gray-100 border-gray-300 text-gray-500'; if(d<t)return'bg-red-50 border-red-200 text-red-800'; if(d<=d3)return'bg-yellow-50 border-yellow-200 text-yellow-800'; if(l)return'bg-blue-50 border-blue-200 text-blue-800'; return'bg-white border-gray-100 text-gray-800';
  };
  return (
    <div onClick={()=>onEdit?.(item)} className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all hover:shadow-md mb-3 cursor-pointer ${getStatusColor(item.expiryDate,isLowStock,item.quantity)}`}>
      <div className="flex items-center gap-4"><div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-3xl border border-gray-100 shadow-sm relative">{item.emoji}</div><div><h4 className="font-bold text-lg flex items-center gap-2">{item.name}{item.quantity===0?<span className="text-[10px] bg-gray-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5"><Ban className="w-3 h-3"/>在庫切れ</span>:isLowStock&&<span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-0.5"><TrendingDown className="w-3 h-3"/>少</span>}</h4><div className="flex gap-2 text-xs opacity-80 mt-1 flex-wrap">{item.quantity!==0&&<span className="bg-white/50 px-1.5 py-0.5 rounded border border-black/10">{item.location}</span>}<span className="font-bold">{item.quantity}{item.unit}</span>{threshold!==undefined&&<span className="text-blue-600"> / 設定:{threshold}</span>}</div></div></div>
      <div className="text-right flex flex-col justify-between h-full">{item.quantity>0&&item.expiryDate&&<><div className="text-sm font-bold">{item.expiryDate.slice(5).replace('-','/')}まで</div></>}<div className="flex justify-end gap-2"><button onClick={(e)=>{e.stopPropagation();onAddToShoppingList(item.name,1,item.unit);}} className="p-1.5 hover:bg-green-100 text-green-600 rounded-full transition-colors"><ShoppingCart className="w-4 h-4"/></button>{item.id!=='temp'&&!item.id.startsWith('temp')&&<button onClick={(e)=>{e.stopPropagation();deleteItem(item.id);}} className="p-1.5 hover:bg-red-100 text-red-600 rounded-full transition-colors"><Trash2 className="w-4 h-4"/></button>}</div></div>
    </div>
  );
};

function InventoryList({ items, deleteItem, onAddToShoppingList, lowStockItems, stockThresholds, inventoryFilterMode, setInventoryFilterMode, onEdit }: any) {
  const [filter, setFilter] = useState<StorageType|'all'>('all');
  const [sortBy, setSortBy] = useState<'expiry'|'added'|'name'>('expiry');
  const [isGrouped, setIsGrouped] = useState(true);

  const displayItems = useMemo(() => {
    let baseItems = [...items];
    if (inventoryFilterMode === 'lowStock') {
       const existingNames = new Set(items.map((i: any) => i.categorySmall || i.name));
       const missingNames = lowStockItems.filter((name: string) => !existingNames.has(name));
       const missingFoodItems: FoodItem[] = missingNames.map((name: string) => {
         let emoji='📦'; for(const[k,v]of Object.entries(EMOJI_KEYWORDS)){if(name.includes(k)){emoji=v;break;}}
         return { id: `temp-${name}`, name, storage: 'ambient', category: 'other', categorySmall: name, location: '', expiryDate: '', quantity: 0, unit: '個', addedDate: '', emoji };
       });
       baseItems = [...baseItems, ...missingFoodItems];
    }
    return baseItems;
  }, [items, inventoryFilterMode, lowStockItems]);

  const filteredItems = displayItems.filter((item: any) => {
    if (inventoryFilterMode==='lowStock') return lowStockItems.includes(item.categorySmall||item.name);
    if (inventoryFilterMode==='expired') return item.expiryDate<(new Date().toISOString().split('T')[0]) && item.quantity>0;
    if (inventoryFilterMode==='near') { const t=new Date().toISOString().split('T')[0]; const d3=new Date(Date.now()+259200000).toISOString().split('T')[0]; return item.expiryDate>=t && item.expiryDate<=d3 && item.quantity>0; }
    return filter==='all' ? true : item.storage===filter;
  });

  const getSortedItems = (list: FoodItem[]) => {
    const sorted = [...list];
    if (sortBy==='expiry') sorted.sort((a,b)=>(!a.expiryDate?1:!b.expiryDate?-1:a.expiryDate.localeCompare(b.expiryDate)));
    else if (sortBy==='added') sorted.sort((a,b)=>b.addedDate.localeCompare(a.addedDate));
    else sorted.sort((a,b)=>a.name.localeCompare(b.name,'ja'));
    return sorted;
  };

  const filters: {id:StorageType|'all',label:string,icon:any}[] = [{id:'all',label:'すべて',icon:LayoutDashboard},{id:'refrigerator',label:'冷蔵室',icon:Refrigerator},{id:'vegetable',label:'野菜室',icon:Carrot},{id:'freezer_main',label:'冷凍(主)',icon:Snowflake},{id:'freezer_sub',label:'冷凍(副)',icon:IceCream},{id:'ambient',label:'常温',icon:Sun}];
  const modeTabs: {id:FilterMode,label:string,icon:any,color:string}[] = [{id:'all',label:'すべて',icon:LayoutDashboard,color:'bg-gray-100'},{id:'expired',label:'期限切れ',icon:AlertTriangle,color:'bg-red-100'},{id:'near',label:'期限近',icon:AlertOctagon,color:'bg-yellow-100'},{id:'lowStock',label:'在庫少',icon:TrendingDown,color:'bg-blue-100'}];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
        {modeTabs.map(t=><button key={t.id} onClick={()=>setInventoryFilterMode(t.id)} className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-bold ${inventoryFilterMode===t.id?`${t.color} ring-2 ring-gray-200`:'text-gray-400'}`}><t.icon className="w-5 h-5 mb-1"/>{t.label}</button>)}
      </div>
      <div className="flex flex-col gap-3">
        {inventoryFilterMode==='all' && <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">{filters.map(t=><button key={t.id} onClick={()=>setFilter(t.id as any)} className={`flex items-center gap-2 px-4 py-2 rounded-full border flex-shrink-0 ${filter===t.id?'bg-gray-800 text-white':'bg-white text-gray-600'}`}><t.icon className="w-4 h-4"/>{t.label}</button>)}</div>}
        <div className="flex justify-between items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
           <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-green-600" checked={isGrouped} onChange={(e)=>setIsGrouped(e.target.checked)}/><span className="font-bold text-xs">カテゴリー</span></label>
           <select className="p-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-700" value={sortBy} onChange={(e)=>setSortBy(e.target.value as any)}><option value="expiry">期限順</option><option value="added">登録順</option><option value="name">名前順</option></select>
        </div>
      </div>
      <div className="space-y-6">
        {filteredItems.length===0?<div className="text-center py-12 text-gray-400"><p>なし</p></div>:isGrouped?
          [...Object.keys(CATEGORY_LABELS).filter(k=>k!=='other'),'other'].map(k=>{
            const grp=getSortedItems(filteredItems.filter((i:any)=>(i.category||'other')===k));
            if(grp.length===0)return null;
            return <div key={k} className="animate-fade-in-up"><h3 className="font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg mb-3 text-sm inline-block">{CATEGORY_LABELS[k]||'その他'}</h3><div>{grp.map(item=><ItemCard key={item.id} item={item} deleteItem={deleteItem} onAddToShoppingList={onAddToShoppingList} isLowStock={lowStockItems.includes(item.categorySmall||item.name)} threshold={stockThresholds[item.categorySmall||item.name]} onEdit={onEdit}/>)}</div></div>
          })
          :<div className="grid gap-0 animate-fade-in-up">{getSortedItems(filteredItems).map(item=><ItemCard key={item.id} item={item} deleteItem={deleteItem} onAddToShoppingList={onAddToShoppingList} isLowStock={lowStockItems.includes(item.categorySmall||item.name)} threshold={stockThresholds[item.categorySmall||item.name]} onEdit={onEdit}/>)}</div>
        }
      </div>
    </div>
  );
}

function SettingsScreen({ categoryOptions, expirySettings, setExpirySettings, stockThresholds, setStockThresholds, showToast, apiKey, saveApiKey }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'expiry'|'stock'|'api'>('expiry');
  const [inputApiKey, setInputApiKey] = useState(apiKey);
  const handleExpiryChange = (item: string, days: number) => { setExpirySettings((prev: any) => ({ ...prev, [item]: days })); };
  const handleStockChange = (item: string, count: number) => { setStockThresholds((prev: any) => ({ ...prev, [item]: count })); };
  const filteredCategoryOptions = useMemo(() => {
    if (!searchTerm) return categoryOptions;
    const filtered: Record<string, string[]> = {};
    Object.keys(categoryOptions).forEach(catKey => {
      const items = categoryOptions[catKey];
      const matchedItems = items.filter((item: string) => item.toLowerCase().includes(searchTerm.toLowerCase()));
      if (matchedItems.length > 0) filtered[catKey] = matchedItems;
    });
    return filtered;
  }, [categoryOptions, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><Settings className="w-6 h-6 text-gray-600"/>アプリ設定</h3>
        <div className="flex bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto"><button onClick={()=>setActiveTab('expiry')} className={`flex-1 py-2 px-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab==='expiry'?'bg-white text-green-600 shadow-sm':'text-gray-500'}`}>賞味期限</button><button onClick={()=>setActiveTab('stock')} className={`flex-1 py-2 px-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab==='stock'?'bg-white text-blue-600 shadow-sm':'text-gray-500'}`}>在庫アラート</button><button onClick={()=>setActiveTab('api')} className={`flex-1 py-2 px-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab==='api'?'bg-white text-purple-600 shadow-sm':'text-gray-500'}`}>AI設定</button></div>
        {activeTab==='api'?<div className="space-y-4"><h4 className="font-bold text-gray-800">Google Gemini APIキー</h4><input type="password" className="w-full p-3 bg-gray-50 border rounded-xl" placeholder="APIキー" value={inputApiKey} onChange={(e)=>setInputApiKey(e.target.value)}/><button onClick={()=>saveApiKey(inputApiKey)} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold">保存</button></div>:
        <><div className="mb-6 relative"><Search className="absolute left-3 top-3 text-gray-400 w-5 h-5"/><input type="text" placeholder="食品検索..." className="w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)}/></div><div className="space-y-6">{Object.keys(filteredCategoryOptions).map(cat=><div key={cat}><h4 className="font-bold text-gray-800 mb-2">{CATEGORY_LABELS[cat]||cat}</h4><div className="grid grid-cols-2 gap-4">{filteredCategoryOptions[cat].map((i:string)=><div key={i} className="flex justify-between border-b pb-2"><span className="text-sm font-medium">{i}</span><input type="number" className="w-16 p-1 bg-gray-50 border rounded text-right" value={activeTab==='expiry'?expirySettings[i]||'':stockThresholds[i]||''} onChange={(e)=>activeTab==='expiry'?handleExpiryChange(i,Number(e.target.value)):handleStockChange(i,Number(e.target.value))}/></div>)}</div></div>)}</div></>}
      </div>
    </div>
  );
}

function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl h-[70vh] flex flex-col shadow-2xl p-4">
        <div className="flex justify-between items-center mb-4"><h3 className="font-bold">アイコン選択</h3><button onClick={onClose}><X className="w-6 h-6 text-gray-500"/></button></div>
        <div className="flex-1 overflow-y-auto space-y-6">{Object.entries(EMOJI_LIBRARY).map(([cat,emojis])=><div key={cat}><h4 className="text-xs font-bold text-gray-500 mb-2">{cat}</h4><div className="grid grid-cols-6 gap-2">{emojis.map(e=><button key={e} onClick={()=>onSelect(e)} className="text-3xl p-2 hover:bg-gray-100 rounded">{e}</button>)}</div></div>)}</div>
      </div>
    </div>
  );
}

function EditItemModal({ item, onClose, onSave, categoryOptions, locationOptions, unitOptions }: any) {
  const [data, setData] = useState({ ...item });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(data); };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">食品の編集</h3><button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4"><button type="button" onClick={() => setShowEmojiPicker(true)} className="w-12 h-12 bg-gray-50 rounded-xl text-3xl border">{data.emoji}</button><div className="flex-1"><label className="text-xs font-bold text-gray-500">商品名</label><input type="text" className="w-full p-2 border-b border-gray-300 focus:border-green-500 outline-none font-bold" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} /></div></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-gray-500">数量</label><input type="number" className="w-full p-2 bg-gray-50 rounded-lg border" value={data.quantity} onChange={(e) => setData({ ...data, quantity: Number(e.target.value) })} /></div><div><label className="text-xs font-bold text-gray-500">単位</label><select className="w-full p-2 bg-gray-50 rounded-lg border" value={data.unit} onChange={(e) => setData({ ...data, unit: e.target.value })}>{unitOptions.map((u: string) => <option key={u} value={u}>{u}</option>)}</select></div></div>
          <div><label className="text-xs font-bold text-gray-500">賞味期限</label><input type="date" className="w-full p-2 bg-gray-50 rounded-lg border" value={data.expiryDate} onChange={(e) => setData({ ...data, expiryDate: e.target.value })} /></div>
          <button type="submit" className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-md mt-4">保存する</button>
        </form>
      </div>
      {showEmojiPicker && <EmojiPicker onSelect={(emoji: string) => { setData({ ...data, emoji }); setShowEmojiPicker(false); }} onClose={() => setShowEmojiPicker(false)} />}
    </div>
  );
}

function AddItemForm({ onAdd, onCancel, categoryOptions, addCategoryOption, expirySettings, locationOptions, addLocationOption, unitOptions, addUnitOption, emojiHistory, updateEmojiHistory }: any) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<any>({ storage: 'refrigerator', category: '', categorySmall: '', location: '', quantity: 1, unit: '個', expiryDate: '', emoji: '📦' });
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    const name = isCustom ? customName : data.categorySmall;
    if (name) {
      if (emojiHistory[name]) { setData((p:any) => ({ ...p, emoji: emojiHistory[name] })); return; }
      for (const [k, v] of Object.entries(EMOJI_KEYWORDS)) if (name.includes(k)) { setData((p:any) => ({ ...p, emoji: v })); break; }
    }
    if (data.category && !name) {
       const map:any = { dairy:'🥛', egg:'🥚', meat:'🥩', fish:'🐟', vegetable:'🥦', fruit:'🍎' };
       setData((p:any)=>({...p, emoji: map[data.category]||'📦'}));
    }
  }, [data.category, data.categorySmall, customName, isCustom, emojiHistory]);

  useEffect(() => {
    if (!isCustom && data.categorySmall && expirySettings[data.categorySmall]) {
      const d = new Date(); d.setDate(d.getDate() + expirySettings[data.categorySmall]);
      setData((p:any) => ({ ...p, expiryDate: d.toISOString().split('T')[0] }));
    }
  }, [data.categorySmall, isCustom, expirySettings]);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const name = isCustom ? customName : data.categorySmall;
    if(isCustom) addCategoryOption(data.category, name);
    if(name) updateEmojiHistory(name, data.emoji);
    onAdd({ id: Math.random().toString(36).substr(2, 9), name: name || '食品', ...data, categorySmall: name, addedDate: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
      <div className="flex items-center mb-6">{[1, 2, 3].map(i => (<div key={i} className={`flex-1 h-2 rounded-full mx-1 ${step >= i ? 'bg-green-500' : 'bg-gray-200'}`} />))}</div>
      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-center mb-4">保存場所</h3>
            <div className="grid grid-cols-2 gap-3">{Object.keys(locationOptions).map(k=><button key={k} type="button" onClick={()=>{setData({...data,storage:k});setStep(2);}} className={`p-4 rounded-xl border ${data.storage===k?'border-green-500 bg-green-50':'hover:bg-gray-50'}`}>{k}</button>)}</div>
            <div className="mt-4"><button type="button" onClick={onCancel} className="w-full py-3 bg-gray-100 rounded-xl">キャンセル</button></div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-center mb-4">カテゴリー</h3>
            <div className="grid grid-cols-2 gap-3">{Object.keys(CATEGORY_LABELS).map(k=><button key={k} type="button" onClick={()=>{setData({...data,category:k});setStep(3);}} className="p-4 rounded-xl border hover:bg-gray-50">{CATEGORY_LABELS[k]}</button>)}</div>
            <div className="mt-4"><button type="button" onClick={() => setStep(1)} className="w-full py-2 text-gray-400">戻る</button></div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-6">
             <div className="flex items-center gap-4 border-b pb-4"><button type="button" onClick={() => setShowEmojiPicker(true)} className="w-16 h-16 bg-gray-50 rounded-2xl text-4xl">{data.emoji}</button><div><h3 className="text-xl font-bold">{isCustom ? customName : data.categorySmall}</h3></div></div>
             <div><label className="block text-sm font-bold mb-2">商品名</label>{!isCustom ? <select className="w-full p-3 bg-gray-50 rounded-xl" value={data.categorySmall} onChange={(e)=>{if(e.target.value==='NEW'){setIsCustom(true);setCustomName('');}else{setData({...data,categorySmall:e.target.value});}}}><option value="">選択</option>{categoryOptions[data.category]?.map((o:string)=><option key={o} value={o}>{o}</option>)}<option value="NEW">+ 新規入力</option></select> : <div className="flex gap-2"><input type="text" className="w-full p-3 border rounded-xl" value={customName} onChange={e=>setCustomName(e.target.value)} placeholder="名称入力"/><button type="button" onClick={()=>{setIsCustom(false);setData({...data,categorySmall:''});}} className="px-3 bg-gray-100 rounded-lg">戻る</button></div>}</div>
             <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-bold">数量</label><input type="number" className="w-full p-3 bg-gray-50 rounded-xl" value={data.quantity} onChange={e=>setData({...data,quantity:Number(e.target.value)})}/></div><div><label className="text-sm font-bold">単位</label><select className="w-full p-3 bg-gray-50 rounded-xl" value={data.unit} onChange={e=>setData({...data,unit:e.target.value})}>{unitOptions.map((u:string)=><option key={u} value={u}>{u}</option>)}</select></div></div>
             <div><label className="text-sm font-bold">賞味期限</label><input type="date" className="w-full p-3 bg-gray-50 rounded-xl" value={data.expiryDate} onChange={e=>setData({...data,expiryDate:e.target.value})}/></div>
             <div className="flex gap-3 pt-4"><button type="button" onClick={onCancel} className="flex-1 py-3 bg-gray-100 rounded-xl">キャンセル</button><button type="submit" className="flex-1 py-3 bg-green-500 text-white rounded-xl shadow-md">登録</button></div>
          </div>
        )}
      </form>
      {showEmojiPicker && <EmojiPicker onSelect={(emoji) => { setData({...data, emoji}); setShowEmojiPicker(false); }} onClose={() => setShowEmojiPicker(false)} />}
    </div>
  );
}

function RecipeGenerator({ items, onAddToShoppingList, history, onAddHistory, apiKey }: any) {
  const [loading, setLoading] = useState(false);
  const [userRequest, setUserRequest] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  const generateRecipe = async (mode: 'auto' | 'custom') => {
    setLoading(true);
    if (!apiKey) { alert("APIキーを設定してください"); setLoading(false); return; }
    const inventoryList = items.map((i: any) => `${i.name} (${i.quantity}${i.unit})`).join(', ');
    const prompt = `食材リスト: ${inventoryList}。${mode==='custom'?`要望: ${userRequest}。`:''}これらを考慮してレシピを1つ提案して。JSON形式: {title:料理名, time:調理時間, desc:概要, ingredients:[{name:食材名, amount:量, unit:単位}], missing:[{name:不足食材, amount:量, unit:単位}], steps:[手順1, 手順2...]}`;
    try {
      const data = await callGeminiWithRetry(apiKey, { contents: [{ parts: [{ text: prompt }] }] });
      const jsonStr = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/)[0];
      const recipeData = JSON.parse(jsonStr);
      const newRecipe = { id: Date.now().toString(), ...recipeData, mode, createdAt: new Date().toLocaleString(), userRequest: mode === 'custom' ? userRequest : undefined, allMaterials: [...recipeData.ingredients, ...recipeData.missing] };
      onAddHistory(newRecipe);
      setSelectedRecipe(newRecipe);
    } catch (error) { console.error(error); alert("生成失敗"); } finally { setLoading(false); }
  };

  const handleAddMissing = (recipe: any) => { recipe.missing.forEach((item: RecipeMaterial) => onAddToShoppingList(item.name, 1, item.unit)); };

  if (selectedRecipe) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedRecipe(null)} className="flex items-center gap-1 text-gray-500 font-bold mb-2"><ChevronLeft className="w-5 h-5" /> 戻る</button>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-2">{selectedRecipe.title}</h3>
          <div className="flex gap-2 text-sm text-gray-500 mb-4"><span>⏱ {selectedRecipe.time}</span></div>
          <div className="mb-4"><h4 className="font-bold text-sm text-gray-700 mb-2">材料</h4><div className="flex flex-wrap gap-2">{selectedRecipe.ingredients.map((i:any,k:number)=><span key={k} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">{i.name}</span>)}</div></div>
          {selectedRecipe.missing.length>0 && <div className="mb-4"><h4 className="font-bold text-sm text-red-700 mb-2">不足</h4><div className="flex flex-wrap gap-2 mb-2">{selectedRecipe.missing.map((i:any,k:number)=><span key={k} className="bg-red-50 text-red-700 border border-red-100 px-2 py-1 rounded text-xs">{i.name}</span>)}</div><button onClick={()=>handleAddMissing(selectedRecipe)} className="w-full py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2"><Plus className="w-4 h-4"/>不足分をリストへ</button></div>}
          <div className="mt-6 border-t pt-4"><h4 className="font-bold text-gray-800 mb-3">👨‍🍳 作り方</h4><ul className="space-y-3">{selectedRecipe.steps?.map((s:string,i:number)=><li key={i} className="flex gap-3 text-sm text-gray-600"><span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-xs">{i+1}</span><span className="pt-0.5">{s}</span></li>)}</ul></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200 text-center">
        <ChefHat className="w-12 h-12 text-orange-500 mx-auto mb-3" /><h3 className="text-xl font-bold text-gray-800 mb-2">AIシェフに相談</h3>
        <button onClick={() => generateRecipe('auto')} disabled={loading} className="w-full py-3 bg-white text-orange-600 border-2 border-orange-500 rounded-xl font-bold shadow-sm mb-6">{loading ? '考案中...' : '🎲 おまかせ提案'}</button>
        <div className="mb-3 text-left"><label className="text-sm font-bold text-gray-700">要望</label><textarea className="w-full p-3 rounded-xl border mt-1 text-sm" rows={2} placeholder="例：さっぱりしたもの、10分以内..." value={userRequest} onChange={(e) => setUserRequest(e.target.value)} /></div>
        <button onClick={() => generateRecipe('custom')} disabled={loading} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold shadow-md">{loading ? '考案中...' : '✨ 要望で提案'}</button>
      </div>
      <div><h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><History className="w-5 h-5" />履歴</h3>{history.length===0?<p className="text-center text-gray-400 py-8">履歴なし</p>:<div className="space-y-3">{history.map((r:Recipe)=><div key={r.id} onClick={()=>setSelectedRecipe(r)} className="bg-white p-4 rounded-xl border shadow-sm cursor-pointer"><h4>{r.title}</h4></div>)}</div>}</div>
    </div>
  );
}

function ShoppingList({ items, onToggle, onDelete, onAdd, onUpdateQuantity, onExport, unitOptions, addUnitOption }: any) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('個');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [customUnitName, setCustomUnitName] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      let finalUnit = isCustomUnit ? customUnitName : newItemUnit;
      if (isCustomUnit) addUnitOption(customUnitName);
      onAdd(newItemName.trim(), newItemQuantity, finalUnit);
      setNewItemName(''); setNewItemQuantity(1);
      if (isCustomUnit) { setNewItemUnit(customUnitName); setIsCustomUnit(false); setCustomUnitName(''); }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-blue-600" />買い物リスト</h3><button onClick={onExport} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:bg-blue-50 px-3 py-1.5 rounded-lg"><Share2 className="w-4 h-4" /> Keep</button></div>
        <form onSubmit={handleAdd} className="mb-6"><div className="flex gap-2 mb-2"><input type="text" className="flex-[2] p-3 bg-gray-50 border rounded-xl" placeholder="商品名" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} /><div className="flex flex-1 gap-1"><input type="number" min="1" className="w-16 p-3 bg-gray-50 border rounded-xl text-center" value={newItemQuantity} onChange={(e) => setNewItemQuantity(Number(e.target.value))} />{!isCustomUnit ? (<select className="flex-1 p-3 bg-gray-50 border rounded-xl text-sm" value={newItemUnit} onChange={(e) => { if (e.target.value === 'NEW') { setIsCustomUnit(true); setCustomUnitName(''); } else { setNewItemUnit(e.target.value); } }}>{unitOptions.map((opt: string) => (<option key={opt} value={opt}>{opt}</option>))}<option value="NEW">+ 新規</option></select>) : (<div className="flex-1 flex gap-1"><input type="text" className="w-full p-3 bg-white border rounded-xl text-sm" placeholder="単位" value={customUnitName} onChange={(e) => setCustomUnitName(e.target.value)} required autoFocus /><button type="button" onClick={() => { setIsCustomUnit(false); setNewItemUnit('個'); }} className="px-2 text-gray-500 bg-gray-100 rounded-lg text-xs">戻る</button></div>)}</div></div><button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md" disabled={!newItemName.trim()}><Plus className="w-5 h-5 inline mr-1"/>追加</button></form>
        <div className="space-y-2">{items.length===0?<p className="text-center py-8 text-gray-400">リストは空です</p>:items.map((item:any)=><div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${item.isChecked?'bg-gray-50 opacity-60':'bg-white'}`}><button onClick={()=>onToggle(item.id)}>{item.isChecked?<CheckSquare className="w-6 h-6 text-green-500"/>:<Square className="w-6 h-6 text-gray-300"/>}</button><div className="flex-1"><span className={`block font-bold ${item.isChecked?'line-through':''}`}>{item.name}</span><span className="text-xs text-gray-500">{formatAmountStr(item.quantity,item.unit)}</span></div><button onClick={()=>onDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></div>)}</div>
      </div>
    </div>
  );
}

function ScannerModal({ onClose, onScan, apiKey, categoryOptions, addCategoryOption, locationOptions, addLocationOption, emojiHistory, expirySettings }: any) {
  const [scanning, setScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReceiptCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setScanning(true);
      if (!apiKey) { alert("APIキーが必要です"); setScanning(false); return; }
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        const prompt = `レシートを解析しJSONで出力して。{items:[{name:商品名, quantity:数値, unit:単位, expiryDate:YYYY-MM-DD(推測), category:dairy|egg|vegetable|fruit|meat|fish|other, emoji:絵文字}]}`;
        const data = await callGeminiWithRetry(apiKey, { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: e.target.files[0].type, data: base64 } }] }] });
        const jsonStr = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/)[0];
        const result = JSON.parse(jsonStr);
        setScannedItems(result.items.map((i:any, idx:number) => ({ ...i, id: Date.now()+idx, storage: 'refrigerator', categorySmall: i.name, location: '未設定', addedDate: new Date().toISOString().split('T')[0], isSelected: true })));
        setShowConfirm(true);
      } catch (error) { console.error(error); alert("解析失敗"); } finally { setScanning(false); }
    }
  };

  const handleConfirm = () => {
    const itemsToAdd = scannedItems.filter(i => i.isSelected).map(({ isSelected, ...rest }) => rest);
    itemsToAdd.forEach((item: FoodItem) => {
         const catOpts = categoryOptions[item.category] || [];
         if (!catOpts.includes(item.categorySmall)) addCategoryOption(item.category, item.categorySmall);
         const locOpts = locationOptions[item.storage] || [];
         if (!locOpts.includes(item.location)) addLocationOption(item.storage, item.location);
         if (emojiHistory[item.categorySmall]) item.emoji = emojiHistory[item.categorySmall];
    });
    onScan(itemsToAdd);
  };

  const updateScannedItem = (index: number, field: string, value: any) => {
    const newItems = [...scannedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setScannedItems(newItems);
  };

  const toggleSelectAll = () => {
    const allSelected = scannedItems.every(i => i.isSelected);
    setScannedItems(prev => prev.map(i => ({ ...i, isSelected: !allSelected })));
  };

  if (showConfirm) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-4 border-b flex justify-between items-center"><h3 className="font-bold">確認</h3><div className="flex gap-2"><button onClick={toggleSelectAll} className="text-xs bg-blue-50 px-2 py-1 rounded text-blue-600 font-bold">{scannedItems.every(i=>i.isSelected)?'全解除':'全選択'}</button><button onClick={onClose}><X/></button></div></div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">{scannedItems.map((item, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${item.isSelected?'border-green-500 bg-green-50':'border-gray-200 opacity-60'}`}>
              <button onClick={()=>updateScannedItem(i,'isSelected',!item.isSelected)}>{item.isSelected?<CheckSquare className="text-green-500"/>:<Square className="text-gray-400"/>}</button>
              <div className="flex-1 space-y-1"><input className="w-full bg-transparent font-bold border-b border-gray-300 focus:border-green-500 outline-none" value={item.name} onChange={(e)=>updateScannedItem(i,'name',e.target.value)} /><div className="flex gap-2"><input type="number" className="w-16 bg-white border rounded px-1 text-sm" value={item.quantity} onChange={(e)=>updateScannedItem(i,'quantity',Number(e.target.value))} /><input className="w-16 bg-white border rounded px-1 text-sm" value={item.unit} onChange={(e)=>updateScannedItem(i,'unit',e.target.value)} /></div></div>
            </div>
          ))}</div>
          <div className="p-4 border-t bg-white"><button onClick={handleConfirm} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg">追加する</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden p-4 flex flex-col items-center">
        <label className="w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors mb-4">
            <Camera className="w-12 h-12 text-gray-400 mb-2" /><span className="text-sm text-gray-500 font-bold">写真を撮る / アップロード</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReceiptCapture} />
        </label>
        {scanning && <div className="flex items-center gap-2 text-blue-600 font-bold"><Loader2 className="animate-spin"/> 解析中...</div>}
        <button onClick={onClose} className="mt-4 w-full py-3 bg-gray-100 rounded-xl font-bold text-gray-500">キャンセル</button>
      </div>
    </div>
  );
}