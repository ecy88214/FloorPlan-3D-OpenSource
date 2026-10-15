export const MATS = {
  wood:    {name:'橡木地板', price:320, sw:'#eedecb'},
  walnut:  {name:'胡桃木地板', price:380, sw:'#bda188'},
  tile800: {name:'800 地磚', price:220, sw:'#f6f3ed'},
  tile600: {name:'600 地磚', price:160, sw:'#eef1ef'},
  marble:  {name:'大理石', price:650, sw:'#faf8f5'},
  antislip:{name:'300 防滑磚', price:140, sw:'#e5ebea'},
  terrazzo:{name:'水磨石', price:280, sw:'#ece5da'},
  carpet:  {name:'滿鋪地毯', price:200, sw:'#d9d4cc'},
};
export const LIB = [
  {cat:'臥室', items:[
    ['bed','雙人床 1.8m',1800,2000,'#f4efe8'],['bed','雙人床 1.5m',1500,2000,'#f4efe8'],['bed','單人床',900,2000,'#8ea896'],
    ['crib','嬰兒床',1250,700,'#f2ebe1'],['nightstand','床頭櫃',450,450,'#d8bea2'],['wardrobe','衣櫃',1800,600,'#dfcbba'],
    ['wardrobe','小衣櫃',1200,550,'#dfcbba'],['dresser','梳妝台',1000,450,'#d8bea2'],['desk','書桌',1400,600,'#d8bea2'],
    ['chair','椅子',500,500,'#76937f'],['bookshelf','書架',800,300,'#d8bea2'],['baycushion','飄窗墊',520,1800,'#e7dccd']]},
  {cat:'客廳', items:[
    ['sofa','三人沙發',2200,900,'#ede8df'],['sofa','雙人沙發',1700,880,'#ede8df'],['cornersofa','轉角沙發',2700,2000,'#ede8df'],
    ['armchair','單人沙發',800,800,'#76937f'],['beanbag','懶人沙發',800,800,'#ede8df'],['coffeetable','茶几',1200,600,'#d8bea2'],
    ['sidetable','邊几',800,800,'#f8f8f7'],['tvstand','電視櫃',2000,400,'#d8bea2'],['rug','地毯',2400,1700,'#ede7dc'],
    ['shoecab','鞋櫃',1000,350,'#d8bea2'],['shoecab','玄關櫃',1200,400,'#d8bea2'],['floorlamp','立燈',450,450,'#fff6dd'],
    ['plant','植栽',500,500,'#5c8766'],['plant','大植栽',700,700,'#4d7557']]},
  {cat:'餐廚', items:[
    ['table','餐桌',1400,800,'#d8bea2'],['table','六人餐桌',1800,900,'#d8bea2'],['roundtable','圓桌',1000,1000,'#d8bea2'],
    ['chair','餐椅',500,500,'#b87462'],['island','島台',1800,900,'#f8f8f7'],['barstool','吧椅',420,420,'#76937f'],
    ['counter','廚櫃檯面',2400,600,'#f8f8f7'],['stove','瓦斯爐',750,450,'#1f2937'],['ksink','水槽',800,450,'#cbd5e1'],
    ['fridge','冰箱',700,700,'#d5d9dd'],['cabinet','餐邊櫃',1200,400,'#d8bea2']]},
  {cat:'衛浴', items:[
    ['toilet','馬桶',400,700,'#ffffff'],['bidettoilet','免治馬桶',430,720,'#ffffff'],['vanity','浴室櫃',600,450,'#ffffff'],['vanity','雙盆浴室櫃',1200,500,'#ffffff'],
    ['shower','淋浴間',900,900,'#bae6fd'],['bathtub','浴缸',1700,750,'#ffffff'],['washer','洗衣機',600,600,'#ffffff'],
    ['waterheater','電熱水器',800,450,'#f4f4f2'],['cabinet','收納櫃',1000,400,'#d8bea2']]},
  {cat:'家電', items:[
    ['tv','65 吋電視',1450,80,'#1d1d1f'],['tv','55 吋電視',1230,80,'#1d1d1f'],['fridge','對開式冰箱',910,700,'#d5d9dd'],
    ['aircon','落地式冷氣',500,380,'#f6f7f8'],['acwall','壁掛式冷氣',900,250,'#f6f7f8'],['dishwasher','洗碗機',600,600,'#d5d9dd'],
    ['ovencol','蒸烤箱高櫃',600,600,'#dfcbba'],['dryer','烘衣機',600,600,'#ffffff'],['purifier','空氣淨化器',400,300,'#f4f4f2']]},
  {cat:'書房 · 休閒', items:[
    ['desk','長書桌',1400,600,'#d8bea2'],['officechair','辦公椅',650,650,'#718096'],['bookshelf','大書架',1800,300,'#d8bea2'],
    ['piano','立式鋼琴',1500,600,'#242322'],['treadmill','跑步機',800,1800,'#374151'],['armchair','閱讀椅',800,800,'#ede8df']]},
  {cat:'牆體', items:[
    ['wall','橫向標準隔間牆',2400,180,'#8a8378'],
    ['wall','直向標準隔間牆',180,2400,'#8a8378'],
    ['walllow','橫向矮牆',1800,120,'#b5ada3'],
    ['walllow','直向矮牆',120,1800,'#b5ada3'],
    ['wallglass','橫向玻璃隔間',1800,80,'#bae6fd'],
    ['wallglass','直向玻璃隔間',80,1800,'#bae6fd'],
    ['wallcurve','弧形隔間',1600,180,'#9a9388']]
  },
  {cat:'窗戶', items:[
    ['windowbuilt','建築窗戶',1500,240,'#bae6fd'],
    ['window','單扇窗',900,120,'#bae6fd'],['windowwide','落地窗',1800,120,'#bae6fd'],['windowslide','推拉窗',1500,120,'#bae6fd'],['windowbay','飄窗',1400,400,'#bae6fd'],['windowproject','突出牆體窗戶',1500,550,'#a3d5ea'],['windowcorner','轉角窗',1200,120,'#bae6fd']]
  },
  {cat:'房門', items:[
    ['door','單扇房門',900,90,'#c8ab8d'],['dooropen','開啟房門',900,90,'#c8ab8d'],['doorentry','入口門',1100,120,'#8c6c52'],['doordouble','雙扇房門',1600,90,'#c8ab8d'],['doorslide','推拉房門',1500,90,'#c8ab8d'],['doorfold','折疊門',1200,90,'#c8ab8d'],['doorglass','玻璃拉門',1600,70,'#bae6fd']]
  },
];
LIB.push({cat:'陽台樣式',items:[
  ['balconyutility','洗衣陽台配置',3000,1800,'#e5ebea'],
  ['balconylounge','休憩陽台配置',3000,1800,'#bda188'],
  ['balconygarden','植栽陽台配置',3000,1800,'#eedecb'],
  ['bench','戶外長凳',1400,400,'#d8bea2'],
  ['vanity','洗衣槽',600,500,'#ffffff']
]});
LIB.push({cat:'空間與建築',items:[
  ['roomzone','自訂地坪／房間',3000,3000,'#f6f3ed'],
  ['wallbearing','橫向承重牆',2400,240,'#3f3c38'],
  ['wallbearing','直向承重牆',240,2400,'#3f3c38'],
  ['wallexterior','橫向外牆',2400,240,'#5c5750'],
  ['wallexterior','直向外牆',240,2400,'#5c5750'],
  ['wallpillar','方柱',400,400,'#3f3c38'],
  ['walllow','陽台矮欄牆',2400,120,'#b5ada3']
]});
export const typeColor = t => { for (const c of LIB) for (const i of c.items) if (i[0]===t) return i[4]; return '#eee'; };
