import React, { useState, useEffect, useMemo } from 'react';
import { 
  Camera, Search, Plus, Calendar, ChefHat, 
  ShoppingCart, AlertTriangle, Check, Trash2, 
  LayoutDashboard,
  Refrigerator, Snowflake, Sun, Share2,
  IceCream, Carrot, Settings, Edit3, ArrowUpDown, X,
  CheckSquare, Square, Minus, MessageSquare,
  History, ChevronLeft, Clock, TrendingDown,
  AlertOctagon, Ban, Save // AlertOctagonとSaveを追加
} from 'lucide-react';

// --- モックデータと型定義 ---

type StorageType = 'refrigerator' | 'freezer_main' | 'freezer_sub' | 'vegetable' | 'ambient';
type ItemCategory = 'dairy' | 'egg' | 'vegetable' | 'fruit' | 'meat' | 'fish' | 'other';
type FilterMode = 'all' | 'expired' | 'near' | 'lowStock';

interface FoodItem {
  id: string;
  name: string;
  storage: StorageType;
  category: ItemCategory;
  categorySmall: string;
  location: string;
  expiryDate: string;
  quantity: number;
  unit: string;
  addedDate: string;
  emoji: string;
}

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number; 
  unit: string;     
  isChecked: boolean;
  addedDate: string;
}

// レシピ用材料型定義
interface RecipeMaterial {
  name: string;
  amount: number;
  unit: string;
}

// レシピ型定義
interface Recipe {
  id: string;
  title: string;
  time: string;
  ingredients: RecipeMaterial[]; 
  missing: RecipeMaterial[];    
  desc: string;
  mode: 'auto' | 'custom';
  createdAt: string; 
  userRequest?: string; 
  allMaterials: RecipeMaterial[];
}

// 数量表示の整形ヘルパー関数
const formatAmountStr = (amount: number, unit: string) => {
  const nonNumericUnits = ['少々', '適量', 'お好みで', 'ひとつまみ', '適宜'];
  if (nonNumericUnits.includes(unit)) {
    return unit;
  }
  return `${amount}${unit}`;
};

// 初期データ
const INITIAL_ITEMS: FoodItem[] = [
  { id: '1', name: '牛乳', storage: 'refrigerator', category: 'dairy', categorySmall: '牛乳', location: 'ドアポケット', expiryDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], quantity: 1, unit: '本', addedDate: '2023-10-25', emoji: '🥛' },
  { id: '2', name: '卵', storage: 'refrigerator', category: 'egg', categorySmall: '卵', location: '上段', expiryDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], quantity: 2, unit: '個', addedDate: '2023-10-20', emoji: '🥚' },
  { id: '3', name: '豚バラ肉', storage: 'freezer_main', category: 'meat', categorySmall: '豚肉', location: '上段トレー', expiryDate: new Date(Date.now() + 86400000 * 20).toISOString().split('T')[0], quantity: 200, unit: 'g', addedDate: '2023-10-15', emoji: '🥩' },
  { id: '4', name: '冷凍うどん', storage: 'freezer_sub', category: 'other', categorySmall: '冷凍うどん', location: '製氷室横', expiryDate: new Date(Date.now() + 86400000 * 25).toISOString().split('T')[0], quantity: 2, unit: '玉', addedDate: '2023-10-10', emoji: '🍜' },
  { id: '5', name: 'キャベツ', storage: 'vegetable', category: 'vegetable', categorySmall: 'キャベツ', location: '下段', expiryDate: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0], quantity: 0.5, unit: '玉', addedDate: '2023-10-18', emoji: '🥬' },
  { id: '6', name: '玉ねぎ', storage: 'ambient', category: 'vegetable', categorySmall: '玉ねぎ', location: 'カゴ', expiryDate: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0], quantity: 3, unit: '個', addedDate: '2023-10-18', emoji: '🧅' },
];

const INITIAL_SHOPPING_LIST: ShoppingItem[] = [
  { id: 's1', name: '醤油', quantity: 1, unit: '本', isChecked: false, addedDate: '2023-10-25' },
  { id: 's2', name: 'マヨネーズ', quantity: 1, unit: '本', isChecked: false, addedDate: '2023-10-26' }
];

const INITIAL_UNIT_OPTIONS = [
  '個', '本', 'g', 'kg', 'ml', 'L', 'パック', '玉', '袋', '束', '枚', '切れ', '缶', '瓶', '箱', '少々', '適量'
];

// 絵文字ライブラリ
const EMOJI_LIBRARY: Record<string, string[]> = {
  '野菜・果物': ['🥦', '🥬', '🥒', '🌽', '🥕', '🥔', '🍠', '🍆', '🍅', '🍄', '🧅', '🧄', '🥗', '🌶️', '🫑', '🥑', '🍎', '🍏', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🫒', '🥜', '🌰', '🫘', '🌿', '🌾', '🎋', '🍃', '🍂', '🍁', '🎍', '🪵', '🌵', '☘️', '🌱', '🪴', '🌻', '🌹', '🪷'],
  '肉・魚・卵': ['🥩', '🍗', '🥓', '🍖', '🍔', '🌭', '🐟', '🐠', '🐡', '🦐', '🦞', '🦀', '🦑', '🐙', '🍣', '🍱', '🥚', '🍳', '🦈', '🐳', '🐋', '🐬', '🦪', '🍥', '🍤', '🦃', '🐓', '🐖', '🐄', '🐂', '🐃', '🐑', '🐐', '🦌', '🐗'],
  '乳製品・飲料': ['🥛', '🧀', '🧈', '🍦', '🍮', '🍼', '🍵', '☕', '🧃', '🥤', '🍺', '🍷', '🍶', '🥃', '🍸', '🧉', '🍾', '🥂', '🍻', '🧊', '🫖', '🍹', '🩸', '💧', '🥣', '🫙'],
  '穀物・麺類': ['🍚', '🍙', '🍛', '🍜', '🍝', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧇', '🍟', '🍕', '🌮', '🌯', '🥡', '🥪', '🫓', '🥟', '🥠', '🍘', '🍠', '🍢', '🍡', '🥘', '🍲', '🫕', '🥙', '🧆', '🍔', '🌭'],
  'スイーツ・調味料': ['🍫', '🍬', '🍭', '🍡', '🍩', '🍪', '🍰', '🧁', '🍯', '🧂', '🥢', '🥄', '🍧', '🍨', '🥧', '🎂', '🍮', '🥞', '🧇', '🥮', '🍿', '🫙', '🏺'],
  'その他': ['📦', '🍱', '🥡', '🥫', '🛍️', '🛒', '🎁', '🍽️', '🍴', '🔪', '🔥', '❄️', '⚡', '🧺', '🧻', '🧼', '🧽', '🧹', '🗑️', '💊', '🩹', '🌡️', '🧸', '🎈', '🎉']
};

// 絵文字推測用キーワードマップ
const EMOJI_KEYWORDS: Record<string, string> = {
  '牛': '🥩', '豚': '🥩', '鶏': '🍗', '肉': '🥩', 'ハム': '🥩', 'ソーセージ': '🌭', 'ベーコン': '🥓', 'ミンチ': '🥩', 'ステーキ': '🥩', '焼肉': '🥩',
  '魚': '🐟', '鮭': '🐟', '鯖': '🐟', '鯵': '🐟', '鰯': '🐟', '鮪': '🐟', '刺身': '🐟', '切り身': '🐟',
  'エビ': '🦐', '海老': '🦐', 'カニ': '🦀', '蟹': '🦀', 'イカ': '🦑', 'タコ': '🐙', '貝': '🦪', 'あさり': '🦪', 'しじみ': '🦪',
  '牛乳': '🥛', 'ミルク': '🥛', '豆乳': '🧃', '乳飲料': '🧃',
  'ヨーグルト': '🥣', 'のむヨーグルト': '🧃', 'カップヨーグルト': '🥣', 'チーズ': '🧀', 'バター': '🧈', 'マーガリン': '🧈', 'クリーム': '🧁',
  '卵': '🥚', 'たまご': '🥚', '玉子': '🥚', 'うずら': '🥚',
  'キャベツ': '🥬', 'レタス': '🥬', '白菜': '🥬', 'ほうれん草': '🥬', '小松菜': '🥬', '青梗菜': '🥬', 'ニラ': '🥬', '春菊': '🥬',
  'トマト': '🍅', 'ミニトマト': '🍅', 'なす': '🍆', 'ナス': '🍆', 'ピーマン': '🫑', 'パプリカ': '🫑',
  'とうもろこし': '🌽', 'コーン': '🌽',
  'きゅうり': '🥒', 'ブロッコリー': '🥦', 'カリフラワー': '🥦', 'アボカド': '🥑', 'アスパラ': '🎍',
  '芋': '🥔', 'ポテト': '🥔', 'じゃがいも': '🥔', 'さつまいも': '🍠', '里芋': '🥔', '長芋': '🥔',
  '人参': '🥕', 'にんじん': '🥕', '大根': '🥢', 'ごぼう': '🥢', 'レンコン': '🥢',
  '玉ねぎ': '🧅', 'タマネギ': '🧅', 'ネギ': '🧅', 'ねぎ': '🧅', 'ニンニク': '🧄', 'しょうが': '🫚',
  'きのこ': '🍄', 'マッシュルーム': '🍄', 'しめじ': '🍄', '舞茸': '🍄', 'エリンギ': '🍄', '椎茸': '🍄', 'えのき': '🍄',
  'りんご': '🍎', 'リンゴ': '🍎', '青りんご': '🍏',
  'みかん': '🍊', 'オレンジ': '🍊', 'グレープフルーツ': '🍊', 'レモン': '🍋', 'ゆず': '🍋',
  'バナナ': '🍌', 'ぶどう': '🍇', 'マスカット': '🍇', 'いちご': '🍓', 'メロン': '🍈', 'スイカ': '🍉',
  '桃': '🍑', 'さくらんぼ': '🍒', '梨': '🍐', 'パイナップル': '🍍', 'マンゴー': '🥭', 'キウイ': '🥝',
  'ご飯': '🍚', '米': '🍚', 'おにぎり': '🍙', 'パン': '🍞', '食パン': '🍞', 'ロールパン': '🥐', 'クロワッサン': '🥐', 'バゲット': '🥖', 'フランスパン': '🥖',
  'サンドイッチ': '🥪', 'ハンバーガー': '🍔', 'ピザ': '🍕', '中華まん': '🥟', '肉まん': '🥟',
  'うどん': '🍜', 'そば': '🍜', 'ラーメン': '🍜', 'パスタ': '🍝', 'スパゲッティ': '🍝', '麺': '🍜', '焼きそば': '🥡',
  'カレー': '🍛', 'シチュー': '🍲', '鍋': '🍲', 'スープ': '🥣', '味噌汁': '🥣', '弁当': '🍱', '寿司': '🍣',
  'アイス': '🍨', 'ソフトクリーム': '🍦', 'チョコ': '🍫', 'クッキー': '🍪', 'ケーキ': '🍰', 'プリン': '🍮', 'ゼリー': '🍮',
  '団子': '🍡', '大福': '🍡', '和菓子': '🍵', 'ドーナツ': '🍩', 'キャンディ': '🍬', 'スナック': '🍿', 'ポテチ': '🥔',
  '酒': '🍶', 'ビール': '🍺', '発泡酒': '🍺', 'ワイン': '🍷', 'シャンパン': '🍾', 'チューハイ': '🍹', 'サワー': '🍹', 'ハイボール': '🥃', 'ウイスキー': '🥃', '焼酎': '🍶', '日本酒': '🍶',
  'ジュース': '🧃', 'コーラ': '🥤', 'サイダー': '🥤', 'コーヒー': '☕', '珈琲': '☕', 'お茶': '🍵', '紅茶': '🫖', '水': '💧', 'ミネラルウォーター': '💧', '炭酸水': '💧',
  '塩': '🧂', '砂糖': '🫙', '醤油': '🫙', 'ソース': '🫙', 'マヨネーズ': '🫙', 'ケチャップ': '🫙', 'ドレッシング': '🫙', '油': '🫗', 'だし': '🍲',
  '豆腐': '🧊', '納豆': '🥢', 'こんにゃく': '🧊', 'ちくわ': '🥢', 'かまぼこ': '🍥', '缶詰': '🥫', 'ジャム': '🫙'
};

// 食材同義語辞書
const INGREDIENT_SYNONYMS: Record<string, string[]> = {
  '米': ['ご飯', '白米', 'ライス'],
  'ご飯': ['米', '白米', 'ライス'],
  '豚肉': ['豚バラ', '豚こま', '豚ひき肉', '豚ミンチ'],
  '鶏肉': ['鶏もも肉', '鶏むね肉', '鶏ささみ', '鶏ひき肉', '鶏ミンチ'],
  'ひき肉': ['豚ひき肉', '牛ひき肉', '合い挽き肉', '鶏ひき肉', 'ミンチ'],
  'ミンチ': ['豚ひき肉', '牛ひき肉', '合い挽き肉', '鶏ひき肉', 'ひき肉'],
  'ネギ': ['長ネギ', '万能ネギ', '白ネギ', '青ネギ'],
  '麺': ['中華麺', 'うどん', 'そば', 'パスタ', 'スパゲッティ'],
  '中華麺': ['ラーメン', '焼きそば麺'],
  '卵': ['玉子', 'たまご'],
  'じゃがいも': ['ジャガイモ', 'ポテト'],
  '人参': ['にんじん', 'ニンジン'],
  '玉ねぎ': ['タマネギ', 'たまねぎ']
};

// カテゴリーラベル
const CATEGORY_LABELS: Record<string, string> = {
  dairy: '🥛 乳製品',
  egg: '🥚 卵',
  meat: '🥩 肉類',
  fish: '🐟 魚介',
  vegetable: '🥦 野菜',
  fruit: '🍎 果物',
  other: '🥫 その他'
};

const INITIAL_CATEGORY_OPTIONS: Record<ItemCategory, string[]> = {
  dairy: ['牛乳', 'ヨーグルト', 'チーズ', 'バター', '生クリーム'],
  egg: ['卵', 'うずらの卵', '温泉卵'],
  meat: ['豚肉', '牛肉', '鶏肉', 'ハム', 'ソーセージ'],
  fish: ['鮭', 'サバ', 'ブリ', '刺身'],
  vegetable: ['キャベツ', '人参', '玉ねぎ', 'トマト', 'レタス', 'じゃがいも', 'きゅうり'],
  fruit: ['りんご', 'バナナ', 'みかん', 'レモン', 'いちご'],
  other: ['冷凍うどん', 'アイス', '豆腐', '納豆']
};

const INITIAL_LOCATION_OPTIONS: Record<StorageType, string[]> = {
  refrigerator: ['ドアポケット', '上段', '中段', '下段', 'チルドルーム', '低温スペース'],
  freezer_main: ['上段トレー', '下段引き出し'],
  freezer_sub: ['製氷室横'],
  vegetable: ['上段トレイ', '下段'],
  ambient: ['パントリー', 'キッチン棚', 'カゴ', '床下収納']
};

const DEFAULT_EXPIRY_DAYS: Record<string, number> = {
  '牛乳': 7, '卵': 14, '納豆': 10, 'ヨーグルト': 14,
  '豚肉': 3, '牛肉': 3, '鶏肉': 2, 'ハム': 10,
  'キャベツ': 7, 'レタス': 4, 'トマト': 5,
  '冷凍うどん': 30, 'アイス': 90, '玉ねぎ': 30,
  'りんご': 14, 'バナナ': 4, 'みかん': 7 
};

// 在庫アラートのデフォルト閾値
const DEFAULT_STOCK_THRESHOLDS: Record<string, number> = {
  '卵': 3,
  '牛乳': 1,
  '納豆': 1,
  '玉ねぎ': 1,
  '人参': 1
};

// --- アプリケーション本体 ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'add' | 'recipes' | 'shopping' | 'settings'>('dashboard');
  const [items, setItems] = useState<FoodItem[]>(INITIAL_ITEMS);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(INITIAL_SHOPPING_LIST);
  const [recipeHistory, setRecipeHistory] = useState<Recipe[]>([]); 
  
  const [categoryOptions, setCategoryOptions] = useState(INITIAL_CATEGORY_OPTIONS); 
  const [locationOptions, setLocationOptions] = useState(INITIAL_LOCATION_OPTIONS); 
  const [unitOptions, setUnitOptions] = useState<string[]>(INITIAL_UNIT_OPTIONS);
  
  const [expirySettings, setExpirySettings] = useState<Record<string, number>>(DEFAULT_EXPIRY_DAYS);
  const [stockThresholds, setStockThresholds] = useState<Record<string, number>>(DEFAULT_STOCK_THRESHOLDS); // 在庫閾値設定
  const [emojiHistory, setEmojiHistory] = useState<Record<string, string>>(() => {
    const history: Record<string, string> = {};
    INITIAL_ITEMS.forEach(item => {
      history[item.categorySmall] = item.emoji;
    });
    return history;
  });

  // 在庫管理の表示モード
  const [inventoryFilterMode, setInventoryFilterMode] = useState<FilterMode>('all');

  const [showScannerModal, setShowScannerModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const addCategoryOption = (category: ItemCategory, newOption: string) => {
    setCategoryOptions(prev => {
      const currentOptions = prev[category] || [];
      if (!currentOptions.includes(newOption)) {
        return {
          ...prev,
          [category]: [...currentOptions, newOption]
        };
      }
      return prev;
    });
  };

  const addLocationOption = (storage: StorageType, newOption: string) => {
    setLocationOptions(prev => {
      const currentOptions = prev[storage] || [];
      if (!currentOptions.includes(newOption)) {
        return {
          ...prev,
          [storage]: [...currentOptions, newOption]
        };
      }
      return prev;
    });
  };

  const addUnitOption = (newUnit: string) => {
    setUnitOptions(prev => {
      if (!prev.includes(newUnit)) {
        return [...prev, newUnit];
      }
      return prev;
    });
  };

  const updateEmojiHistory = (name: string, emoji: string) => {
    setEmojiHistory(prev => ({ ...prev, [name]: emoji }));
  };

  const addRecipeToHistory = (recipe: Recipe) => {
    setRecipeHistory(prev => [recipe, ...prev]);
  };

  const addToShoppingList = (itemName: string, quantity: number = 1, unit: string = '個') => {
    setShoppingList(prev => {
      if (prev.some(item => item.name === itemName)) {
        showToast(`${itemName} は既にリストにあります`);
        return prev;
      }
      return [...prev, {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: itemName,
        quantity: quantity,
        unit: unit,
        isChecked: false,
        addedDate: new Date().toISOString().split('T')[0]
      }];
    });
    showToast(`${itemName} を買い物リストに追加しました`);
  };

  const toggleShoppingItem = (id: string) => {
    setShoppingList(prev => prev.map(item => 
      item.id === id ? { ...item, isChecked: !item.isChecked } : item
    ));
  };

  const deleteShoppingItem = (id: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };

  const updateShoppingItemQuantity = (id: string, delta: number) => {
    setShoppingList(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  // 在庫不足アイテムの計算ロジック (閾値未設定のものは除外)
  const lowStockItems = useMemo(() => {
    const groupedStock: Record<string, number> = {};
    items.forEach(item => {
      const key = item.categorySmall || item.name;
      groupedStock[key] = (groupedStock[key] || 0) + item.quantity;
    });

    const lowStockList: string[] = [];
    Object.keys(stockThresholds).forEach(key => {
      const threshold = stockThresholds[key];
      // 閾値が有効な数値で、かつ0より大きい場合のみ判定する
      if (typeof threshold === 'number' && threshold > 0) {
        const currentStock = groupedStock[key] || 0;
        if (currentStock < threshold) { 
          lowStockList.push(key);
        }
      }
    });
    return lowStockList;
  }, [items, stockThresholds]);

  const statusCounts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const threeDaysLater = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    
    let expired = 0;
    let warning = 0;
    
    items.forEach(item => {
      if (item.expiryDate < today) expired++;
      else if (item.expiryDate <= threeDaysLater) warning++;
    });
    
    return { expired, warning, total: items.length, lowStock: lowStockItems.length };
  }, [items, lowStockItems]);

  const deleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
    showToast('商品を削除しました');
  };

  const exportToKeep = () => {
    const text = shoppingList.filter(i => !i.isChecked)
      .map(i => `・${i.name} ${formatAmountStr(i.quantity, i.unit)}`)
      .join('\n');
    console.log(text);
    showToast('Google Keepのリストに追加しました (Demo)');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-20 md:pb-0 md:pl-64">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} counts={statusCounts} />

      <main className="p-4 max-w-4xl mx-auto">
        <Header activeTab={activeTab} setShowScannerModal={setShowScannerModal} />
        
        {notification && (
          <div className="fixed top-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-down">
            {notification}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard 
            items={items} 
            counts={statusCounts} 
            setActiveTab={setActiveTab}
            setInventoryFilterMode={setInventoryFilterMode} 
          />
        )}
        {activeTab === 'inventory' && (
          <InventoryList 
            items={items} 
            deleteItem={deleteItem} 
            onAddToShoppingList={addToShoppingList}
            lowStockItems={lowStockItems}
            stockThresholds={stockThresholds} 
            inventoryFilterMode={inventoryFilterMode} 
            setInventoryFilterMode={setInventoryFilterMode} 
          />
        )}
        {activeTab === 'add' && (
          <AddItemForm 
            categoryOptions={categoryOptions}
            addCategoryOption={addCategoryOption}
            locationOptions={locationOptions} 
            addLocationOption={addLocationOption} 
            unitOptions={unitOptions} 
            addUnitOption={addUnitOption} 
            expirySettings={expirySettings}
            emojiHistory={emojiHistory} 
            updateEmojiHistory={updateEmojiHistory}
            onAdd={(newItem: FoodItem) => {
              setItems([...items, newItem]);
              showToast(`${newItem.name} を追加しました`);
              setActiveTab('inventory');
            }} 
          />
        )}
        {activeTab === 'recipes' && (
          <RecipeGenerator 
            items={items} 
            onAddToShoppingList={addToShoppingList}
            history={recipeHistory} 
            onAddHistory={addRecipeToHistory} 
          />
        )}
        {activeTab === 'shopping' && (
          <ShoppingList 
            items={shoppingList}
            onToggle={toggleShoppingItem}
            onDelete={deleteShoppingItem}
            onAdd={addToShoppingList}
            onUpdateQuantity={updateShoppingItemQuantity} 
            onExport={exportToKeep}
            unitOptions={unitOptions} 
            addUnitOption={addUnitOption} 
          />
        )}
        {activeTab === 'settings' && (
          <SettingsScreen 
            categoryOptions={categoryOptions}
            expirySettings={expirySettings}
            setExpirySettings={setExpirySettings}
            stockThresholds={stockThresholds} 
            setStockThresholds={setStockThresholds} 
            showToast={showToast}
          />
        )}
      </main>

      {showScannerModal && (
        <ScannerModal 
          onClose={() => setShowScannerModal(false)} 
          categoryOptions={categoryOptions}
          addCategoryOption={addCategoryOption}
          locationOptions={locationOptions} 
          addLocationOption={addLocationOption} 
          expirySettings={expirySettings}
          emojiHistory={emojiHistory} 
          onScan={(scannedItems: FoodItem[]) => {
            setItems([...items, ...scannedItems]);
            setShowScannerModal(false);
            showToast(`${scannedItems.length}件のアイテムを読み取りました`);
          }}
        />
      )}
    </div>
  );
}

// ... Subcomponents ...

function Navigation({ activeTab, setActiveTab, counts }: any) {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'ホーム' },
    { id: 'inventory', icon: Refrigerator, label: '冷蔵庫' },
    { id: 'add', icon: Plus, label: '追加', isAction: true },
    { id: 'recipes', icon: ChefHat, label: 'レシピ' },
    { id: 'shopping', icon: ShoppingCart, label: '買い物' },
    { id: 'settings', icon: Settings, label: '設定' }, 
  ];

  return (
    <>
      <div className="hidden md:flex flex-col w-64 bg-white h-screen fixed left-0 top-0 border-r border-gray-200 shadow-sm z-10">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-green-600 flex items-center gap-2">
            <Refrigerator className="w-8 h-8" />
            SmartFridge
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === tab.id 
                  ? 'bg-green-100 text-green-700 font-semibold' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <div className="relative">
                <tab.icon className="w-6 h-6" />
                {/* 期限切れバッジ */}
                {tab.id === 'inventory' && counts.expired > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                )}
                {/* 在庫不足バッジ (NEW) */}
                {tab.id === 'inventory' && counts.expired === 0 && counts.lowStock > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></span>
                )}
              </div>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-40 px-2 py-2 flex justify-between items-center shadow-lg safe-area-bottom">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center w-full p-2 rounded-lg ${
              activeTab === tab.id ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            {tab.isAction ? (
              <div className="bg-green-500 text-white p-3 rounded-full shadow-md transform -translate-y-4 border-4 border-gray-50">
                <Plus className="w-6 h-6" />
              </div>
            ) : (
              <>
                <div className="relative">
                  <tab.icon className="w-6 h-6 mb-1" />
                   {/* 期限切れバッジ */}
                  {tab.id === 'inventory' && counts.expired > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                  )}
                  {/* 在庫不足バッジ */}
                  {tab.id === 'inventory' && counts.expired === 0 && counts.lowStock > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

function Header({ activeTab, setShowScannerModal }: any) {
  const titles: any = {
    dashboard: 'ダッシュボード',
    inventory: '在庫管理',
    add: '食品の追加',
    recipes: 'AIレシピ提案',
    shopping: '買い物リスト',
    settings: '設定'
  };

  return (
    <header className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-gray-800">{titles[activeTab]}</h2>
      {activeTab !== 'settings' && (
        <div className="flex gap-2">
          <button className="p-2 bg-white rounded-full shadow-sm border border-gray-200 text-gray-600">
            <Search className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowScannerModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Google Lens Scan</span>
          </button>
        </div>
      )}
    </header>
  );
}

// Dashboard更新 (各カードクリックでの遷移設定)
function Dashboard({ items, counts, setActiveTab, setInventoryFilterMode }: any) {
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      date: d,
      iso: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('ja-JP', { weekday: 'short' })
    };
  });

  const handleCardClick = (filter: FilterMode) => {
    setInventoryFilterMode(filter);
    setActiveTab('inventory');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3">
        <button 
          onClick={() => handleCardClick('all')}
          className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-4 hover:bg-gray-50 transition-colors"
        >
          <span className="text-2xl font-bold text-gray-800">{counts.total}</span>
          <span className="text-[10px] text-gray-500 mt-1">全アイテム</span>
        </button>
        <button 
          onClick={() => handleCardClick('expired')}
          className="bg-red-50 p-2 rounded-2xl border border-red-100 flex flex-col items-center justify-center py-4 hover:bg-red-100 transition-colors"
        >
          <span className="text-2xl font-bold text-red-600">{counts.expired}</span>
          <span className="text-[10px] text-red-500 mt-1 font-semibold">期限切れ</span>
        </button>
        <button 
          onClick={() => handleCardClick('near')}
          className="bg-yellow-50 p-2 rounded-2xl border border-yellow-100 flex flex-col items-center justify-center py-4 hover:bg-yellow-100 transition-colors"
        >
          <span className="text-2xl font-bold text-yellow-600">{counts.warning}</span>
          <span className="text-[10px] text-yellow-600 mt-1 font-semibold">期限間近</span>
        </button>
        <button 
          onClick={() => handleCardClick('lowStock')}
          className="bg-blue-50 p-2 rounded-2xl border border-blue-100 flex flex-col items-center justify-center py-4 hover:bg-blue-100 transition-colors"
        >
          <span className="text-2xl font-bold text-blue-600">{counts.lowStock}</span>
          <span className="text-[10px] text-blue-600 mt-1 font-semibold">在庫不足</span>
        </button>
      </div>

      {counts.expired > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-700">期限切れの食品があります</h3>
            <p className="text-sm text-red-600">食品ロスを防ぐために確認してください。</p>
            <button 
              onClick={() => handleCardClick('expired')}
              className="mt-2 text-sm font-semibold text-red-700 underline"
            >
              確認する
            </button>
          </div>
        </div>
      )}

      {counts.warning > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-yellow-700">期限間近の食品があります</h3>
            <p className="text-sm text-yellow-600">早めの消費をおすすめします。</p>
            <button 
              onClick={() => handleCardClick('near')}
              className="mt-2 text-sm font-semibold text-yellow-700 underline"
            >
              確認する
            </button>
          </div>
        </div>
      )}

      {counts.lowStock > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl flex items-start gap-3">
          <TrendingDown className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-blue-700">在庫が少なくなっています</h3>
            <p className="text-sm text-blue-600">{counts.lowStock}種類の食品が設定数を下回りました。</p>
            <button 
              onClick={() => handleCardClick('lowStock')}
              className="mt-2 text-sm font-semibold text-blue-700 underline"
            >
              確認して補充する
            </button>
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          期限カレンダー
        </h3>
        <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar">
          {dates.map((d, idx) => {
            const expiringItems = items.filter((i: any) => i.expiryDate === d.iso);
            const hasExpired = expiringItems.length > 0;
            const isToday = idx === 0;

            return (
              <div 
                key={d.iso} 
                className={`flex-shrink-0 w-14 h-24 rounded-full flex flex-col items-center justify-between py-3 border ${
                   isToday ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-white'
                }`}
              >
                <span className="text-xs text-gray-400">{d.day}</span>
                <span className="text-lg font-bold text-gray-700">{d.date.getDate()}</span>
                <div className="h-6 flex items-center justify-center">
                  {hasExpired ? (
                    <div className="w-5 h-5 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-[10px] font-bold">
                      {expiringItems.length}
                    </div>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ItemCard更新 (thresholdプロパティ追加, 色ロジック変更)
const ItemCard = ({ item, deleteItem, onAddToShoppingList, isLowStock, threshold }: { item: FoodItem, deleteItem: (id: string) => void, onAddToShoppingList: (name: string, quantity?: number, unit?: string) => void, isLowStock?: boolean, threshold?: number }) => {
  // 色判定ロジック
  const getStatusColor = (dateStr: string, lowStock?: boolean, quantity?: number) => {
    const today = new Date().toISOString().split('T')[0];
    const threeDays = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    
    // 在庫切れ (0個) -> グレー背景
    if (quantity === 0) return 'bg-gray-100 border-gray-300 text-gray-500';

    // 期限切れ -> 赤
    if (dateStr < today) return 'bg-red-50 border-red-200 text-red-800';
    // 期限間近 -> 黄
    if (dateStr <= threeDays) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    // 在庫少 -> 水色 (優先順位は期限より低い)
    if (lowStock) return 'bg-blue-50 border-blue-200 text-blue-800'; 
    
    return 'bg-white border-gray-100 text-gray-800';
  };

  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all hover:shadow-md mb-3 ${getStatusColor(item.expiryDate, isLowStock, item.quantity)}`}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-3xl border border-gray-100 shadow-sm relative">
            {item.emoji}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center text-white text-[10px]">
              {item.storage === 'refrigerator' ? <Refrigerator className="w-3 h-3"/> :
                item.storage === 'vegetable' ? <Carrot className="w-3 h-3"/> :
                item.storage === 'freezer_main' ? <Snowflake className="w-3 h-3"/> :
                item.storage === 'freezer_sub' ? <IceCream className="w-3 h-3"/> :
                <Sun className="w-3 h-3"/>}
            </div>
        </div>
        <div>
          <h4 className="font-bold text-lg leading-tight flex items-center gap-2">
            {item.name}
            {/* 在庫切れバッジ (NEW) */}
            {item.quantity === 0 ? (
              <span className="text-[10px] bg-gray-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap">
                <Ban className="w-3 h-3" />
                在庫切れ
              </span>
            ) : isLowStock && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap">
                <TrendingDown className="w-3 h-3" />
                残りわずか
              </span>
            )}
          </h4>
          <div className="flex gap-2 text-xs opacity-80 mt-1 flex-wrap">
            {/* 在庫切れ時は場所を表示しないか「-」にする */}
            <span className="bg-white/50 px-1.5 py-0.5 rounded border border-black/10">
              {item.quantity === 0 ? '-' : item.location}
            </span>
            <span className="font-bold">現在: {item.quantity}{item.unit}</span>
            {threshold !== undefined && (
               <span className="text-blue-600"> / 設定: {threshold}以下</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right flex flex-col justify-between h-full">
        {/* 在庫切れでない場合のみ期限を表示 */}
        {item.quantity > 0 && item.expiryDate && (
          <>
            <div className="text-sm font-bold">{item.expiryDate.slice(5).replace('-','/')}まで</div>
            <div className="text-xs opacity-70 mb-1">あと {Math.ceil((new Date(item.expiryDate).getTime() - new Date().getTime()) / 86400000)} 日</div>
          </>
        )}
        
        <div className="flex justify-end gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onAddToShoppingList(item.name, 1, item.unit); }}
            className="p-1.5 hover:bg-green-100 text-green-600 rounded-full transition-colors"
            title="買い物リストに追加"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
          {/* 在庫切れ（仮アイテム）の場合は削除ボタンを表示しない */}
          {item.id !== 'temp' && !item.id.startsWith('temp') && (
            <button 
              onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
              className="p-1.5 hover:bg-red-100 text-red-600 rounded-full transition-colors"
              title="削除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// InventoryList更新 (フィルタ機能強化 & ダミーデータ生成ロジック変更)
function InventoryList({ items, deleteItem, onAddToShoppingList, lowStockItems, stockThresholds, inventoryFilterMode, setInventoryFilterMode }: any) {
  const [filter, setFilter] = useState<StorageType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'expiry' | 'added' | 'name'>('expiry');
  const [isGrouped, setIsGrouped] = useState(true);

  // 表示用アイテムリストの生成
  const displayItems = useMemo(() => {
    let baseItems = [...items];

    // 在庫少モードの場合、リストにない（在庫0）アイテムも生成して追加する
    if (inventoryFilterMode === 'lowStock') {
       // 現在のアイテムリストにある名前セット
       const existingNames = new Set(items.map((i: any) => i.categorySmall || i.name));
       
       // lowStockItems (名前リスト) の中で、itemsに含まれていないものを探す
       const missingNames = lowStockItems.filter((name: string) => !existingNames.has(name));
       
       // 不足アイテムのダミーデータを生成
       const missingFoodItems: FoodItem[] = missingNames.map((name: string) => {
         // 推測ロジックを再利用して絵文字などを埋める
         let determinedEmoji = '📦';
         // デフォルトカテゴリーは 'other' にしておく
         let determinedCategory: ItemCategory = 'other';
         
         for (const [key, emoji] of Object.entries(EMOJI_KEYWORDS)) {
           if (name.includes(key)) {
             determinedEmoji = emoji;
             break;
           }
         }
         
         return {
           id: `temp-${name}`, 
           name: name,
           storage: 'ambient', // 仮
           category: determinedCategory,
           categorySmall: name,
           location: '', // 空文字に設定
           expiryDate: '', // 期限なし
           quantity: 0,
           unit: '個', // 仮
           addedDate: '',
           emoji: determinedEmoji
         };
       });

       baseItems = [...baseItems, ...missingFoodItems];
    }

    return baseItems;
  }, [items, inventoryFilterMode, lowStockItems]);


  // 1. フィルタリング (モードによる絞り込み)
  const filteredItems = displayItems.filter((item: any) => {
    // モード別フィルタ
    if (inventoryFilterMode === 'lowStock') {
       const key = item.categorySmall || item.name;
       return lowStockItems.includes(key);
    }
    
    if (inventoryFilterMode === 'expired') {
      const today = new Date().toISOString().split('T')[0];
      return item.expiryDate < today && item.quantity > 0;
    }

    if (inventoryFilterMode === 'near') {
      const today = new Date().toISOString().split('T')[0];
      const threeDaysLater = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
      return item.expiryDate >= today && item.expiryDate <= threeDaysLater && item.quantity > 0;
    }

    // 通常モード (all)
    return filter === 'all' ? true : item.storage === filter;
  });

  // 2. ソート関数
  const getSortedItems = (itemsToSort: FoodItem[]) => {
    const sorted = [...itemsToSort];
    if (sortBy === 'expiry') {
      // 期限がない（在庫0）アイテムは後ろへ
      sorted.sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return a.expiryDate.localeCompare(b.expiryDate);
      });
    } else if (sortBy === 'added') {
      sorted.sort((a, b) => b.addedDate.localeCompare(a.addedDate));
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    }
    return sorted;
  };

  const filters: { id: StorageType | 'all', label: string, icon: any }[] = [
    { id: 'all', label: 'すべて', icon: LayoutDashboard },
    { id: 'refrigerator', label: '冷蔵室', icon: Refrigerator },
    { id: 'vegetable', label: '野菜室', icon: Carrot },
    { id: 'freezer_main', label: '冷凍(主)', icon: Snowflake },
    { id: 'freezer_sub', label: '冷凍(副)', icon: IceCream },
    { id: 'ambient', label: '常温', icon: Sun },
  ];

  // モード切り替えタブ
  const modeTabs: { id: FilterMode, label: string, icon: any, color: string }[] = [
    { id: 'all', label: 'すべて', icon: LayoutDashboard, color: 'bg-gray-100 text-gray-600' },
    { id: 'expired', label: '期限切れ', icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
    { id: 'near', label: '期限近', icon: AlertOctagon, color: 'bg-yellow-100 text-yellow-600' },
    { id: 'lowStock', label: '在庫少', icon: TrendingDown, color: 'bg-blue-100 text-blue-600' },
  ];

  return (
    <div className="space-y-4">
      
      {/* 表示モード切り替えタブ (NEW) */}
      <div className="grid grid-cols-4 gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
        {modeTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setInventoryFilterMode(tab.id)}
            className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${
              inventoryFilterMode === tab.id 
                ? `${tab.color} ring-2 ring-offset-1 ring-gray-200` 
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-5 h-5 mb-1" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* フィルタ & ソート UI (通常モード時のみ場所フィルタを表示) */}
      <div className="flex flex-col gap-3">
        {inventoryFilterMode === 'all' && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {filters.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors border flex-shrink-0 ${
                  filter === tab.id 
                    ? 'bg-gray-800 text-white border-gray-800' 
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ソート & グルーピング設定 */}
        <div className="flex flex-wrap justify-between items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
           {/* カテゴリーまとめトグル */}
           <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none hover:opacity-80 transition-opacity">
            <div className={`relative w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${isGrouped ? 'bg-green-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ${isGrouped ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={isGrouped} 
              onChange={(e) => setIsGrouped(e.target.checked)} 
            />
            <span className="font-bold text-xs sm:text-sm">カテゴリー</span>
          </label>

          {/* ソート選択 */}
          <div className="flex items-center gap-2 ml-auto">
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <select 
              className="p-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-100 cursor-pointer"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="expiry">期限順</option>
              <option value="added">登録順</option>
              <option value="name">名前順</option>
            </select>
          </div>
        </div>
      </div>

      {/* リスト表示 */}
      <div className="space-y-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
             <p>該当する食品はありません</p>
          </div>
        ) : isGrouped ? (
          // カテゴリーごとのグループ表示
          // otherは最後に表示 (キー重複修正: filterでotherを除外し、末尾に手動追加)
          [...Object.keys(CATEGORY_LABELS).filter(k => k !== 'other'), 'other'].map((catKey) => {
            const categoryItems = filteredItems.filter((item: FoodItem) => (item.category || 'other') === catKey);
            const sortedGroupItems = getSortedItems(categoryItems);
            
            if (sortedGroupItems.length === 0) return null;

            return (
              <div key={catKey} className="animate-fade-in-up">
                <h3 className="font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg mb-3 inline-block text-sm border border-gray-200">
                  {CATEGORY_LABELS[catKey] || 'その他'}
                </h3>
                <div>
                  {sortedGroupItems.map((item: FoodItem) => (
                    <ItemCard 
                      key={item.id.startsWith('temp') ? item.id : item.id} 
                      item={item} 
                      deleteItem={deleteItem} 
                      onAddToShoppingList={onAddToShoppingList}
                      isLowStock={lowStockItems.includes(item.categorySmall || item.name)} 
                      threshold={stockThresholds[item.categorySmall || item.name]} 
                    />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          // フラット表示 (全体ソート)
          <div className="grid gap-0 animate-fade-in-up">
            {getSortedItems(filteredItems).map((item: FoodItem) => (
              <ItemCard 
                key={item.id.startsWith('temp') ? item.id : item.id} 
                item={item} 
                deleteItem={deleteItem} 
                onAddToShoppingList={onAddToShoppingList} 
                isLowStock={lowStockItems.includes(item.categorySmall || item.name)}
                threshold={stockThresholds[item.categorySmall || item.name]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ... existing SettingsScreen, EmojiPicker, AddItemForm, RecipeGenerator, ShoppingList, ScannerModal ...
function SettingsScreen({ categoryOptions, expirySettings, setExpirySettings, stockThresholds, setStockThresholds, showToast }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'expiry' | 'stock'>('expiry'); // 設定タブ切り替え

  const handleExpiryChange = (item: string, days: number) => {
    setExpirySettings((prev: any) => ({
      ...prev,
      [item]: days
    }));
  };

  const handleStockChange = (item: string, count: number) => {
    setStockThresholds((prev: any) => ({
      ...prev,
      [item]: count
    }));
  };

  // フィルタリングロジック
  const filteredCategoryOptions = useMemo(() => {
    if (!searchTerm) return categoryOptions;

    const filtered: Record<string, string[]> = {};
    Object.keys(categoryOptions).forEach(catKey => {
      const items = categoryOptions[catKey];
      const matchedItems = items.filter((item: string) => 
        item.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matchedItems.length > 0) {
        filtered[catKey] = matchedItems;
      }
    });
    return filtered;
  }, [categoryOptions, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        
        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
          <Settings className="w-6 h-6 text-gray-600" />
          アプリ設定
        </h3>

        {/* 設定タブ */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
          <button 
            onClick={() => setActiveTab('expiry')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'expiry' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-1" />
            賞味期限
          </button>
          <button 
            onClick={() => setActiveTab('stock')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'stock' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingDown className="w-4 h-4 inline mr-1" />
            在庫アラート
          </button>
        </div>

        <p className="text-gray-500 text-sm mb-6">
          {activeTab === 'expiry' 
            ? '食品登録時に自動計算される「登録日からの日数」を設定できます。' 
            : '在庫数がこの値を下回った時に、ホーム画面や在庫リストでアラートを表示します。'
          }
        </p>

        {/* 検索ボックス */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="食品名を検索..."
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-8">
          {Object.keys(filteredCategoryOptions).length === 0 ? (
             <div className="text-center py-8 text-gray-400">
               <p>「{searchTerm}」は見つかりませんでした</p>
             </div>
          ) : (
            Object.keys(filteredCategoryOptions).map((catKey) => (
              <div key={catKey}>
                <h4 className="font-bold text-gray-800 bg-gray-50 px-4 py-2 rounded-lg mb-4 border border-gray-100">
                  {CATEGORY_LABELS[catKey] || catKey}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2">
                  {filteredCategoryOptions[catKey].map((item: string) => (
                    <div key={item} className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="font-medium text-gray-700">{item}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          className={`w-20 p-2 bg-gray-50 border border-gray-200 rounded-lg text-right font-mono font-bold focus:ring-2 outline-none ${
                            activeTab === 'expiry' ? 'focus:ring-green-200 focus:border-green-500' : 'focus:ring-blue-200 focus:border-blue-500'
                          }`}
                          value={activeTab === 'expiry' ? (expirySettings[item] || '') : (stockThresholds[item] || '')}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (activeTab === 'expiry') handleExpiryChange(item, val);
                            else handleStockChange(item, val);
                          }}
                          placeholder="-"
                        />
                        <span className="text-sm text-gray-500 w-8">
                          {activeTab === 'expiry' ? '日後' : '個以下'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
           <button 
             onClick={() => showToast('設定を保存しました')}
             className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold shadow-md hover:bg-green-700 transition-colors"
           >
             <Save className="w-5 h-5" />
             設定を保存
           </button>
        </div>
      </div>
    </div>
  );
}

function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl h-[70vh] flex flex-col shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-800">アイコンを選択</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {Object.entries(EMOJI_LIBRARY).map(([category, emojis]) => (
            <div key={category}>
              <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">{category}</h4>
              <div className="grid grid-cols-6 gap-2">
                {emojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => onSelect(emoji)}
                    className="aspect-square flex items-center justify-center text-3xl hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddItemForm({ onAdd, onCancel, categoryOptions, addCategoryOption, expirySettings, locationOptions, addLocationOption, unitOptions, addUnitOption, emojiHistory, updateEmojiHistory }: any) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<any>({
    storage: 'refrigerator',
    category: '',
    categorySmall: '',
    location: '', 
    quantity: 1,
    unit: '個',
    expiryDate: '',
    emoji: '📦' 
  });
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [customLocationName, setCustomLocationName] = useState('');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [customUnitName, setCustomUnitName] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // 絵文字の自動設定ロジック
  useEffect(() => {
    const currentName = isCustomCategory ? customCategoryName : data.categorySmall;
    
    if (currentName) {
      if (emojiHistory[currentName]) {
        setData((prev: any) => ({ ...prev, emoji: emojiHistory[currentName] }));
        return; 
      }

      let found = false;
      for (const [key, emoji] of Object.entries(EMOJI_KEYWORDS)) {
        if (currentName.includes(key)) {
          setData((prev: any) => ({ ...prev, emoji: emoji }));
          found = true;
          break;
        }
      }
      if (found) return;
    }

    if (data.category) {
      let defaultEmoji = '📦';
      if (data.category === 'dairy') defaultEmoji = '🥛';
      else if (data.category === 'egg') defaultEmoji = '🥚';
      else if (data.category === 'meat') defaultEmoji = '🥩';
      else if (data.category === 'fish') defaultEmoji = '🐟';
      else if (data.category === 'vegetable') defaultEmoji = '🥦';
      else if (data.category === 'fruit') defaultEmoji = '🍎';
      
      if (!currentName) {
         setData((prev: any) => ({ ...prev, emoji: defaultEmoji }));
      }
    }
  }, [data.category, data.categorySmall, customCategoryName, isCustomCategory, emojiHistory]);

  useEffect(() => {
    if (!isCustomCategory && data.categorySmall && expirySettings[data.categorySmall]) {
      const days = expirySettings[data.categorySmall];
      const date = new Date();
      date.setDate(date.getDate() + days);
      setData((prev: any) => ({ ...prev, expiryDate: date.toISOString().split('T')[0] }));
    }
  }, [data.categorySmall, isCustomCategory, expirySettings]);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    
    let finalCategorySmall = data.categorySmall;
    if (isCustomCategory) {
      finalCategorySmall = customCategoryName;
      addCategoryOption(data.category, customCategoryName);
    }

    let finalLocation = data.location;
    if (isCustomLocation) {
      finalLocation = customLocationName;
      addLocationOption(data.storage, customLocationName);
    }

    let finalUnit = data.unit;
    if (isCustomUnit) {
      finalUnit = customUnitName;
      addUnitOption(customUnitName);
    }

    if (finalCategorySmall) {
      updateEmojiHistory(finalCategorySmall, data.emoji);
    }

    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      name: finalCategorySmall || '食品',
      ...data,
      categorySmall: finalCategorySmall, 
      location: finalLocation,
      unit: finalUnit, // 新しい単位を使用
      addedDate: new Date().toISOString().split('T')[0]
    });
  };

  const storageOptions = [
    { id: 'refrigerator', label: '冷蔵室', icon: Refrigerator, color: 'bg-blue-50 text-blue-600', border: 'border-blue-200' },
    { id: 'vegetable', label: '野菜室', icon: Carrot, color: 'bg-green-50 text-green-600', border: 'border-green-200' },
    { id: 'freezer_main', label: '冷凍室(主)', icon: Snowflake, color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-200' },
    { id: 'freezer_sub', label: '冷凍室(副)', icon: IceCream, color: 'bg-purple-50 text-purple-600', border: 'border-purple-200' },
    { id: 'ambient', label: '常温', icon: Sun, color: 'bg-orange-50 text-orange-600', border: 'border-orange-200' },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
      <div className="flex items-center mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className={`flex-1 h-2 rounded-full mx-1 ${step >= i ? 'bg-green-500' : 'bg-gray-200'}`} />
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-center mb-4">保存場所を選んでください</h3>
            <div className="grid grid-cols-2 gap-3">
              {storageOptions.map((opt: any) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { setData({...data, storage: opt.id}); setStep(2); }}
                  className={`p-4 rounded-xl flex flex-col items-center gap-3 border transition-all ${
                    data.storage === opt.id ? 'border-green-500 ring-2 ring-green-100' : `${opt.border} hover:bg-gray-50`
                  }`}
                >
                  <div className={`p-3 rounded-full ${opt.color}`}>
                    <opt.icon className="w-8 h-8" />
                  </div>
                  <span className="font-bold text-sm">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-center mb-4">カテゴリーを選んでください</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'dairy', label: '乳製品', emoji: '🥛' },
                { id: 'egg', label: '卵', emoji: '🥚' },
                { id: 'meat', label: '肉類', emoji: '🥩' },
                { id: 'fish', label: '魚介', emoji: '🐟' },
                { id: 'vegetable', label: '野菜', emoji: '🥦' },
                { id: 'fruit', label: '果物', emoji: '🍎' },
                { id: 'other', label: 'その他', emoji: '🥫' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setData({...data, category: cat.id}); setStep(3); }}
                  className="p-4 rounded-xl border border-gray-200 hover:bg-gray-50 flex flex-col items-center gap-2"
                >
                  <span className="text-3xl">{cat.emoji}</span>
                  <span className="font-bold text-sm">{cat.label}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setStep(1)} className="w-full text-gray-400 text-sm py-2">戻る</button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
             <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
               <button 
                type="button"
                onClick={() => setShowEmojiPicker(true)}
                className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-4xl border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all relative group"
               >
                 {data.emoji}
                 <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                   <Edit3 className="w-6 h-6 text-white" />
                 </div>
               </button>
               <div>
                 <p className="text-xs text-gray-500 font-bold mb-1">アイコンを変更できます</p>
                 <h3 className="text-xl font-bold text-gray-800">
                   {isCustomCategory ? (customCategoryName || '新規アイテム') : (data.categorySmall || 'アイテム詳細')}
                 </h3>
               </div>
             </div>

             <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">商品名（小カテゴリー）</label>
              
              {!isCustomCategory ? (
                <select 
                  className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 mb-2"
                  value={data.categorySmall}
                  onChange={(e) => {
                    if (e.target.value === 'NEW_ENTRY') {
                      setIsCustomCategory(true);
                      setCustomCategoryName('');
                    } else {
                      setData({...data, categorySmall: e.target.value});
                    }
                  }}
                  required
                >
                  <option value="">選択してください</option>
                  {categoryOptions[data.category]?.map((o: string) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                  <option value="NEW_ENTRY" className="text-blue-600 font-bold">+ 新規追加（リストに登録）</option>
                </select>
              ) : (
                <div className="mb-2 animate-fade-in-up">
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      className="w-full p-3 bg-white rounded-xl border-2 border-blue-500 focus:outline-none"
                      placeholder="新しい商品名を入力"
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      required
                      autoFocus
                    />
                    <button 
                      type="button" 
                      onClick={() => { setIsCustomCategory(false); setData({...data, categorySmall: ''}); }}
                      className="px-3 py-2 text-gray-500 bg-gray-100 rounded-lg whitespace-nowrap"
                    >
                      戻る
                    </button>
                  </div>
                  <p className="text-xs text-blue-600 mt-1 ml-1">※この商品はカテゴリーリストに追加されます</p>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">詳細場所（例: ドアポケット）</label>
              
              {!isCustomLocation ? (
                <select 
                  className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                  value={data.location}
                  onChange={(e) => {
                    if (e.target.value === 'NEW_ENTRY') {
                      setIsCustomLocation(true);
                      setCustomLocationName('');
                    } else {
                      setData({...data, location: e.target.value});
                    }
                  }}
                >
                  <option value="">選択してください（任意）</option>
                  {locationOptions[data.storage]?.map((loc: string) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                  <option value="NEW_ENTRY" className="text-blue-600 font-bold">+ 新規追加（リストに登録）</option>
                </select>
              ) : (
                 <div className="mb-2 animate-fade-in-up">
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      className="w-full p-3 bg-white rounded-xl border-2 border-blue-500 focus:outline-none"
                      placeholder="新しい場所を入力"
                      value={customLocationName}
                      onChange={(e) => setCustomLocationName(e.target.value)}
                      required
                      autoFocus
                    />
                    <button 
                      type="button" 
                      onClick={() => { setIsCustomLocation(false); setData({...data, location: ''}); }}
                      className="px-3 py-2 text-gray-500 bg-gray-100 rounded-lg whitespace-nowrap"
                    >
                      戻る
                    </button>
                  </div>
                  <p className="text-xs text-blue-600 mt-1 ml-1">※この場所は「{storageOptions.find(s=>s.id===data.storage)?.label}」の候補に追加されます</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">数量</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                    value={data.quantity}
                    onChange={(e) => setData({...data, quantity: Number(e.target.value)})}
                  />
                </div>
              </div>
               <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">単位</label>
                
                {!isCustomUnit ? (
                  <select 
                      className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                      value={data.unit}
                      onChange={(e) => {
                        if (e.target.value === 'NEW_ENTRY') {
                          setIsCustomUnit(true);
                          setCustomUnitName('');
                        } else {
                          setData({...data, unit: e.target.value});
                        }
                      }}
                    >
                    {unitOptions.map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                    <option value="NEW_ENTRY" className="text-blue-600 font-bold">+ 新規追加（リストに登録）</option>
                  </select>
                ) : (
                  <div className="mb-2 animate-fade-in-up">
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        className="w-full p-3 bg-white rounded-xl border-2 border-blue-500 focus:outline-none"
                        placeholder="単位を入力"
                        value={customUnitName}
                        onChange={(e) => setCustomUnitName(e.target.value)}
                        required
                        autoFocus
                      />
                      <button 
                        type="button" 
                        onClick={() => { setIsCustomUnit(false); setData({...data, unit: '個'}); }}
                        className="px-3 py-2 text-gray-500 bg-gray-100 rounded-lg whitespace-nowrap"
                      >
                        戻る
                      </button>
                    </div>
                    <p className="text-xs text-blue-600 mt-1 ml-1">※この単位はリストに追加されます</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">賞味期限</label>
              <input 
                type="date" 
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-mono"
                value={data.expiryDate}
                onChange={(e) => setData({...data, expiryDate: e.target.value})}
                required
              />
              <p className="text-xs text-green-600 mt-1">✨ 設定された日数（{expirySettings[data.categorySmall] || '?'}日）から自動計算</p>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 text-gray-500 font-bold">戻る</button>
              <button type="submit" className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold shadow-md hover:bg-green-600">
                登録する
              </button>
            </div>
          </div>
        )}
      </form>
      
      {showEmojiPicker && (
        <EmojiPicker 
          onSelect={(emoji) => {
            setData({...data, emoji});
            setShowEmojiPicker(false);
          }}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}
    </div>
  );
}

function RecipeGenerator({ items, onAddToShoppingList, history, onAddHistory }: any) {
  const [loading, setLoading] = useState(false);
  const [userRequest, setUserRequest] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  // 簡易レシピDB (材料オブジェクト化)
  const RECIPE_DB = [
    { title: "肉じゃが", materials: [
      { name: "豚肉", amount: 200, unit: "g" },
      { name: "じゃがいも", amount: 3, unit: "個" },
      { name: "人参", amount: 1, unit: "本" },
      { name: "玉ねぎ", amount: 2, unit: "個" },
      { name: "醤油", amount: 1, unit: "少々" }, 
      { name: "砂糖", amount: 1, unit: "少々" }  
    ]},
    { title: "野菜炒め", materials: [
      { name: "豚肉", amount: 150, unit: "g" },
      { name: "キャベツ", amount: 0.25, unit: "玉" },
      { name: "人参", amount: 0.5, unit: "本" },
      { name: "ピーマン", amount: 2, unit: "個" },
      { name: "塩", amount: 1, unit: "少々" },
      { name: "胡椒", amount: 1, unit: "少々" }
    ]},
    { title: "オムライス", materials: [
      { name: "卵", amount: 2, unit: "個" },
      { name: "鶏肉", amount: 100, unit: "g" },
      { name: "玉ねぎ", amount: 0.5, unit: "個" },
      { name: "ご飯", amount: 1, unit: "膳" },
      { name: "ケチャップ", amount: 1, unit: "適量" } 
    ]},
    { title: "親子丼", materials: [
      { name: "鶏肉", amount: 150, unit: "g" },
      { name: "卵", amount: 2, unit: "個" },
      { name: "ご飯", amount: 1, unit: "膳" },
      { name: "玉ねぎ", amount: 0.5, unit: "個" },
      { name: "醤油", amount: 1, unit: "少々" }, 
      { name: "だし", amount: 1, unit: "少々" }  
    ]},
    { title: "カレーライス", materials: [
      { name: "豚肉", amount: 200, unit: "g" },
      { name: "じゃがいも", amount: 2, unit: "個" },
      { name: "人参", amount: 1, unit: "本" },
      { name: "玉ねぎ", amount: 2, unit: "個" },
      { name: "カレールー", amount: 0.5, unit: "箱" },
      { name: "ご飯", amount: 2, unit: "膳" }
    ]},
    { title: "豚の生姜焼き", materials: [
      { name: "豚肉", amount: 200, unit: "g" },
      { name: "玉ねぎ", amount: 0.5, unit: "個" },
      { name: "生姜", amount: 1, unit: "かけ" },
      { name: "醤油", amount: 1, unit: "少々" }, 
      { name: "酒", amount: 1, unit: "少々" },   
      { name: "みりん", amount: 1, unit: "少々" } 
    ]},
    { title: "冷やし中華", materials: [
      { name: "中華麺", amount: 2, unit: "玉" },
      { name: "ハム", amount: 4, unit: "枚" },
      { name: "きゅうり", amount: 1, unit: "本" },
      { name: "卵", amount: 1, unit: "個" },
      { name: "トマト", amount: 1, unit: "個" },
      { name: "冷やし中華のタレ", amount: 1, unit: "袋" }
    ]},
    { title: "味噌汁", materials: [
      { name: "豆腐", amount: 0.5, unit: "丁" },
      { name: "わかめ", amount: 1, unit: "少々" },
      { name: "ネギ", amount: 0.25, unit: "本" },
      { name: "味噌", amount: 1, unit: "少々" }, 
      { name: "だし", amount: 1, unit: "少々" }  
    ]}
  ];

  // 材料判定ロジック
  const checkIngredients = (recipeMaterials: RecipeMaterial[], inventoryItems: FoodItem[]) => {
    const present: RecipeMaterial[] = [];
    const missing: RecipeMaterial[] = [];

    recipeMaterials.forEach(mat => {
      // 1. 名前(または同義語)が一致する在庫アイテムを全て抽出
      const matchedItems = inventoryItems.filter(item => {
        const itemName = item.categorySmall || item.name;
        
        // 名前部分一致チェック
        let isMatch = itemName.includes(mat.name) || mat.name.includes(itemName);
        
        // 同義語チェック
        if (!isMatch && INGREDIENT_SYNONYMS[mat.name]) {
          isMatch = INGREDIENT_SYNONYMS[mat.name].some(syn => itemName.includes(syn) || syn.includes(itemName));
        }
        return isMatch;
      });

      if (matchedItems.length === 0) {
        // 在庫なし
        missing.push(mat);
      } else {
        // 在庫あり（詳細チェック）
        // 単位が一致するアイテムがあるか確認
        const sameUnitItems = matchedItems.filter(item => item.unit === mat.unit);
        
        if (sameUnitItems.length > 0) {
          // 同じ単位の在庫がある場合、数量を合算して比較
          const totalAmount = sameUnitItems.reduce((sum, item) => sum + item.quantity, 0);
          
          if (totalAmount >= mat.amount) {
            present.push(mat); // 足りてる
          } else {
            missing.push(mat); // 足りない
          }
        } else {
          // 同じ単位の在庫がない場合（単位変換はしないので、とりあえず「ある」扱いにする）
          present.push(mat);
        }
      }
    });
    return { present, missing };
  };

  // 在庫が更新されたら、表示中のレシピの不足状況も更新する
  useEffect(() => {
    if (selectedRecipe) {
       const { present, missing } = checkIngredients(selectedRecipe.allMaterials, items);
       
       setSelectedRecipe((prev: any) => ({
         ...prev,
         ingredients: present,
         missing: missing
       }));
    }
  }, [items]);

  const generateRecipe = (mode: 'auto' | 'custom') => {
    setLoading(true);
    
    setTimeout(() => {
      const targetRecipeData = RECIPE_DB[Math.floor(Math.random() * RECIPE_DB.length)];
      
      const { present, missing } = checkIngredients(targetRecipeData.materials, items);

      const newRecipe = {
        id: Date.now().toString(),
        title: mode === 'auto' ? targetRecipeData.title : `[要望: ${userRequest}] ${targetRecipeData.title}`,
        time: "20分",
        ingredients: present,
        missing: missing,
        allMaterials: targetRecipeData.materials, // 再計算用に保存
        desc: mode === 'auto' 
          ? `${targetRecipeData.title}はいかがですか？ 在庫の${present.map(p => p.name).join('、')}を使えます。`
          : `ご要望「${userRequest}」に合わせて、${targetRecipeData.title}を提案します。不足している調味料などを買い足せば作れます。`,
        mode: mode,
        createdAt: new Date().toLocaleString(),
        userRequest: mode === 'custom' ? userRequest : undefined
      };

      onAddHistory(newRecipe);
      setSelectedRecipe(newRecipe);
      setLoading(false);
    }, 1500);
  };

  const handleAddMissingItems = (recipe: any) => {
    if (!recipe || !recipe.missing || recipe.missing.length === 0) return;
    recipe.missing.forEach((item: RecipeMaterial) => {
      onAddToShoppingList(item.name, item.amount, item.unit); 
    });
  };

  if (selectedRecipe) {
    return (
      <div className="space-y-4">
        <button 
          onClick={() => setSelectedRecipe(null)}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-800 font-bold mb-2"
        >
          <ChevronLeft className="w-5 h-5" /> 戻る
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up">
          <div className="h-32 bg-gray-200 flex items-center justify-center bg-cover bg-center" style={{backgroundImage: 'url("https://images.unsplash.com/photo-1512058564366-18510be2db19?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80")'}}>
            <span className="bg-black/40 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">Image Preview</span>
          </div>
          <div className="p-6">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold text-gray-800">{selectedRecipe.title}</h3>
              <span className="text-xs text-gray-400">{selectedRecipe.createdAt}</span>
            </div>
            <div className="flex gap-2 text-sm text-gray-500 mb-4">
              <span>⏱ {selectedRecipe.time}</span>
              <span>👨‍🍳 {selectedRecipe.mode === 'custom' ? '要望対応' : '簡単'}</span>
            </div>
            
            <div className="mb-4">
              <h4 className="font-bold text-sm text-gray-700 mb-2">使用する在庫</h4>
              <div className="flex flex-wrap gap-2">
                {selectedRecipe.ingredients.length > 0 ? (
                  selectedRecipe.ingredients.map((i: RecipeMaterial, idx: number) => (
                    <span key={idx} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                      {i.name} {formatAmountStr(i.amount, i.unit)}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-xs">なし</span>
                )}
              </div>
            </div>

            {selectedRecipe.missing && selectedRecipe.missing.length > 0 ? (
              <div className="mb-4">
                <h4 className="font-bold text-sm text-red-700 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  不足している材料
                </h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedRecipe.missing.map((i: RecipeMaterial, idx: number) => (
                    <span key={idx} className="bg-red-50 text-red-700 border border-red-100 px-2 py-1 rounded text-xs">
                       {i.name} {formatAmountStr(i.amount, i.unit)}
                    </span>
                  ))}
                </div>
                <button 
                  onClick={() => handleAddMissingItems(selectedRecipe)}
                  className="w-full py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-100 flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  不足している{selectedRecipe.missing.length}点を買い物リストへ
                </button>
              </div>
            ) : (
               <div className="mb-4 bg-green-50 border border-green-200 p-3 rounded-lg flex items-center gap-2 text-green-700 text-sm font-bold">
                 <Check className="w-5 h-5" />
                 すべての材料が揃っています！
               </div>
            )}

            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              {selectedRecipe.desc}
            </p>

            <button className="w-full py-3 border-2 border-orange-500 text-orange-500 rounded-xl font-bold hover:bg-orange-50">
              作り方を見る（外部サイト）
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 生成画面 & 履歴リスト
  return (
    <div className="space-y-8">
      {/* 生成エリア */}
      <div className="bg-gradient-to-r from-orange-100 to-yellow-100 p-6 rounded-2xl border border-orange-200 text-center">
        <ChefHat className="w-12 h-12 text-orange-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">冷蔵庫の中身でシェフに相談</h3>
        
        {/* 1. AIに任せて提案ボタン */}
        <button 
          onClick={() => generateRecipe('auto')}
          disabled={loading}
          className="w-full py-3 bg-white text-orange-600 border-2 border-orange-500 rounded-xl font-bold shadow-sm hover:bg-orange-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mb-6"
        >
          {loading ? '考案中...' : '🎲 AIに任せてレシピを提案する'}
        </button>

        {/* 2. 要望入力欄 */}
        <div className="mb-3 text-left">
            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                シェフへの要望（任意）
            </label>
            <textarea 
                className="w-full p-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                rows={2}
                placeholder="例：辛いものが食べたい、10分で作れるもの、子供が喜ぶ味..."
                value={userRequest}
                onChange={(e) => setUserRequest(e.target.value)}
            />
        </div>

        {/* 3. 要望に合わせて提案ボタン */}
        <button 
          onClick={() => generateRecipe('custom')}
          disabled={loading}
          className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold shadow-md hover:bg-orange-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
            {loading ? '考案中...' : '✨ 要望に合わせてAIがレシピを提案する'}
        </button>
      </div>

      {/* 履歴リスト */}
      <div>
        <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-gray-500" />
          レシピ履歴
        </h3>
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">まだ履歴はありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((rec: Recipe) => (
              <div 
                key={rec.id}
                onClick={() => setSelectedRecipe(rec)}
                className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex justify-between items-center"
              >
                <div>
                  <h4 className="font-bold text-gray-800">{rec.title}</h4>
                  <div className="flex gap-2 text-xs text-gray-500 mt-1">
                    <span>{rec.createdAt}</span>
                    {rec.mode === 'custom' && <span className="text-orange-500">✨ 要望あり</span>}
                  </div>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-300 transform rotate-180" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ... existing ShoppingList, ScannerModal ...
function ShoppingList({ items, onToggle, onDelete, onAdd, onUpdateQuantity, onExport, unitOptions, addUnitOption }: any) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('個');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [customUnitName, setCustomUnitName] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      let finalUnit = newItemUnit;
      if (isCustomUnit) {
        finalUnit = customUnitName;
        addUnitOption(customUnitName);
      }

      onAdd(newItemName.trim(), newItemQuantity, finalUnit);
      setNewItemName('');
      setNewItemQuantity(1);
      // unitはリセットせずそのまま
      if (isCustomUnit) {
        setNewItemUnit(customUnitName); // 新しい単位を選択状態にする
        setIsCustomUnit(false);
        setCustomUnitName('');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            買い物リスト
          </h3>
          <button onClick={onExport} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
            <Share2 className="w-4 h-4" /> Keepに送る
          </button>
        </div>

        {/* 入力フォーム (拡張) */}
        <form onSubmit={handleAdd} className="mb-6">
          <div className="flex gap-2 mb-2">
            <input 
              type="text"
              className="flex-[2] p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="商品名..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
            />
            <div className="flex flex-1 gap-1">
              <input 
                type="number"
                min="1"
                className="w-16 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 text-center"
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(Number(e.target.value))}
              />
              {!isCustomUnit ? (
                <select 
                  className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                  value={newItemUnit}
                  onChange={(e) => {
                    if (e.target.value === 'NEW_ENTRY') {
                      setIsCustomUnit(true);
                      setCustomUnitName('');
                    } else {
                      setNewItemUnit(e.target.value);
                    }
                  }}
                >
                  {unitOptions.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  <option value="NEW_ENTRY" className="text-blue-600 font-bold">+ 新規追加</option>
                </select>
              ) : (
                <div className="flex-1 flex gap-1">
                   <input 
                    type="text"
                    className="w-full p-3 bg-white rounded-xl border-2 border-blue-500 focus:outline-none text-sm"
                    placeholder="単位"
                    value={customUnitName}
                    onChange={(e) => setCustomUnitName(e.target.value)}
                    required
                    autoFocus
                  />
                  <button 
                    type="button" 
                    onClick={() => { setIsCustomUnit(false); setNewItemUnit('個'); }}
                    className="px-2 text-gray-500 bg-gray-100 rounded-lg whitespace-nowrap text-xs"
                  >
                    戻る
                  </button>
                </div>
              )}
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            disabled={!newItemName.trim()}
          >
            <Plus className="w-5 h-5" />
            リストに追加
          </button>
        </form>

        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>リストは空です</p>
            </div>
          ) : (
            items.map((item: any) => (
              <div 
                key={item.id} 
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  item.isChecked ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200 hover:shadow-sm'
                }`}
              >
                <button 
                  onClick={() => onToggle(item.id)}
                  className={`flex-shrink-0 transition-colors ${item.isChecked ? 'text-green-500' : 'text-gray-300 hover:text-green-500'}`}
                >
                  {item.isChecked ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <span className={`block font-bold truncate ${item.isChecked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {item.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatAmountStr(item.quantity, item.unit)}
                  </span>
                </div>

                {/* 数量変更ボタン */}
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                  <button 
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="p-1 hover:bg-white rounded shadow-sm text-gray-500 disabled:opacity-30"
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className="p-1 hover:bg-white rounded shadow-sm text-gray-500"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button 
                  onClick={() => onDelete(item.id)}
                  className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ScannerModal({ onClose, onScan, categoryOptions, addCategoryOption, expirySettings, locationOptions, addLocationOption, emojiHistory }: any) {
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setScanning(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleComplete = () => {
    const scannedItems: FoodItem[] = [
      { id: Date.now().toString(), name: '読み取り: 人参', storage: 'vegetable', category: 'vegetable', categorySmall: '人参', location: '立てて保存', expiryDate: '', quantity: 3, unit: '本', addedDate: new Date().toISOString().split('T')[0], emoji: '🥕' },
      { id: (Date.now()+1).toString(), name: '読み取り: アボカド', storage: 'vegetable', category: 'vegetable', categorySmall: 'アボカド', location: 'カゴ', expiryDate: '', quantity: 1, unit: '個', addedDate: new Date().toISOString().split('T')[0], emoji: '🥑' },
    ];

    scannedItems.forEach(item => {
      const currentCatList = categoryOptions[item.category] || [];
      if (!currentCatList.includes(item.categorySmall)) {
        addCategoryOption(item.category, item.categorySmall);
      }

      const currentLocList = locationOptions[item.storage] || [];
      if (!currentLocList.includes(item.location)) {
        addLocationOption(item.storage, item.location);
      }

      if (emojiHistory[item.categorySmall]) {
        item.emoji = emojiHistory[item.categorySmall];
      }

      const days = expirySettings[item.categorySmall] || 7; 
      const date = new Date();
      date.setDate(date.getDate() + days);
      item.expiryDate = date.toISOString().split('T')[0];
    });

    onScan(scannedItems);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden relative">
        <div className="h-64 bg-gray-900 relative flex items-center justify-center overflow-hidden">
          {scanning ? (
            <>
              <div className="absolute inset-0 border-2 border-blue-500 m-8 rounded-lg animate-pulse z-10"></div>
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500 animate-scan z-10"></div>
              <p className="text-white z-20 font-bold bg-black/50 px-4 py-1 rounded-full">レシート/バーコードをスキャン中...</p>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50"></div>
            </>
          ) : (
             <div className="text-center text-white">
               <Check className="w-12 h-12 mx-auto text-green-500 mb-2" />
               <p className="font-bold">{2}件の商品を検出しました</p>
             </div>
          )}
        </div>
        
        <div className="p-6">
          <h3 className="text-xl font-bold mb-2">Google Lens 連携</h3>
          <p className="text-sm text-gray-500 mb-6">
            カメラでレシートや商品を撮影すると、自動で商品名と賞味期限を読み取ります。<br/>
            <span className="text-blue-600 text-xs">※新商品や新しい場所、アイコン設定は自動学習されます</span>
          </p>
          <div className="flex gap-3">
             <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold">キャンセル</button>
             <button 
              onClick={handleComplete}
              disabled={scanning}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50"
             >
               リストに追加
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}