export const MATS = {
  wood:    {name:'橡木地板', price:320, sw:'#d8b88a'},
  walnut:  {name:'胡桃木地板', price:380, sw:'#9b7250'},
  tile800: {name:'800 地磚', price:220, sw:'#ebe6dc'},
  tile600: {name:'600 地磚', price:160, sw:'#dfe3e1'},
  marble:  {name:'大理石', price:650, sw:'#f1eee8'},
  antislip:{name:'300 防滑磚', price:140, sw:'#d3d8d4'},
  terrazzo:{name:'水磨石', price:280, sw:'#e6dfd3'},
  carpet:  {name:'滿鋪地毯', price:200, sw:'#c9c3d3'},
};
export const LIB = [
  {cat:'臥室', items:[
    ['bed','雙人床 1.8m',1800,2000,'#c9d6df'],['bed','雙人床 1.5m',1500,2000,'#d8c7dc'],['bed','單人床',1200,2000,'#e8d5b5'],
    ['crib','嬰兒床',1250,700,'#efe3d0'],['nightstand','床頭櫃',450,400,'#e8dccb'],['wardrobe','衣櫃',2000,600,'#efe6d8'],
    ['wardrobe','小衣櫃',1200,550,'#efe6d8'],['dresser','梳妝台',1000,450,'#efe6d8'],['desk','書桌',1200,600,'#e2cfb4'],
    ['chair','椅子',450,480,'#cfc6b8'],['bookshelf','書架',800,300,'#e2cfb4'],['baycushion','飄窗墊',520,1800,'#e7dccd']]},
  {cat:'客廳', items:[
    ['sofa','三人沙發',2400,900,'#b7c4b0'],['sofa','雙人沙發',1700,880,'#c3cbd6'],['cornersofa','轉角沙發',2800,1700,'#b7c4b0'],
    ['armchair','單人沙發',850,850,'#d6b99a'],['beanbag','懶人沙發',800,800,'#e0b98f'],['coffeetable','茶几',1300,650,'#e8dccb'],
    ['sidetable','邊几',500,500,'#d9c3a3'],['tvstand','電視櫃',2400,400,'#e2cfb4'],['rug','地毯',2400,1700,'#d9cbb8'],
    ['shoecab','鞋櫃',1000,350,'#efe6d8'],['shoecab','玄關櫃',1400,380,'#e6dccc'],['floorlamp','立燈',450,450,'#3d3a34'],
    ['plant','植栽',500,500,'#a9c39b'],['plant','大植栽',700,700,'#9dbb8c']]},
  {cat:'餐廚', items:[
    ['table','餐桌',1400,800,'#e2cfb4'],['table','六人餐桌',1800,900,'#d8c2a2'],['roundtable','圓桌',1000,1000,'#e2cfb4'],
    ['chair','餐椅',450,480,'#cfc6b8'],['island','島台',1800,900,'#e9e5de'],['barstool','吧椅',420,420,'#6b5d4c'],
    ['counter','廚櫃檯面',1600,600,'#e9e5de'],['stove','瓦斯爐',750,450,'#dcdcdc'],['ksink','水槽',800,450,'#e1e6ea'],
    ['fridge','冰箱',700,700,'#dfe4e8'],['cabinet','餐邊櫃',1600,400,'#efe6d8']]},
  {cat:'衛浴', items:[
    ['toilet','馬桶',400,700,'#ffffff'],['bidettoilet','免治馬桶',430,720,'#f7f8f7'],['vanity','浴室櫃',800,500,'#eef1f3'],['vanity','雙盆浴室櫃',1200,500,'#eef1f3'],
    ['shower','淋浴間',900,900,'#e4edf2'],['bathtub','浴缸',1600,750,'#eef3f6'],['washer','洗衣機',600,600,'#e6ebee'],
    ['waterheater','電熱水器',800,450,'#f4f4f2'],['cabinet','收納櫃',1000,400,'#efe6d8']]},
  {cat:'家電', items:[
    ['tv','65 吋電視',1450,80,'#1d1d1f'],['tv','55 吋電視',1230,80,'#1d1d1f'],['fridge','對開式冰箱',910,700,'#c9ced3'],
    ['aircon','落地式冷氣',500,380,'#f6f7f8'],['acwall','壁掛式冷氣',900,250,'#f6f7f8'],['dishwasher','洗碗機',600,600,'#c9ced3'],
    ['ovencol','蒸烤箱高櫃',600,600,'#efe6d8'],['dryer','烘衣機',600,600,'#e6ebee'],['purifier','空氣淨化器',400,300,'#f4f4f2']]},
  {cat:'書房 · 休閒', items:[
    ['desk','長書桌',1600,700,'#d8c2a2'],['officechair','辦公椅',620,620,'#4a4f55'],['bookshelf','大書架',1600,350,'#e2cfb4'],
    ['piano','立式鋼琴',1500,600,'#1f1d1b'],['treadmill','跑步機',800,1800,'#3a3a3c'],['armchair','閱讀椅',750,800,'#c9a98a']]},
  {cat:'牆體', items:[
    ['wall','橫向標準隔間牆',2400,180,'#77716a'],
    ['wall','直向標準隔間牆',180,2400,'#77716a'],
    ['walllow','橫向矮牆',1800,120,'#a99f91'],
    ['walllow','直向矮牆',120,1800,'#a99f91'],
    ['wallglass','橫向玻璃隔間',1800,80,'#b9dce9'],
    ['wallglass','直向玻璃隔間',80,1800,'#b9dce9'],
    ['wallcurve','弧形隔間',1600,180,'#8a8174']]
  },
  {cat:'窗戶', items:[
    ['windowbuilt','建築窗戶',1500,240,'#b9dce9'],
    ['window','單扇窗',900,120,'#b9dce9'],['windowwide','落地窗',1800,120,'#b9dce9'],['windowslide','推拉窗',1500,120,'#b9dce9'],['windowbay','飄窗',1400,400,'#b9dce9'],['windowproject','突出牆體窗戶',1500,550,'#a6d5e7'],['windowcorner','轉角窗',1200,120,'#b9dce9']]
  },
  {cat:'房門', items:[
    ['door','單扇房門',900,90,'#b78b63'],['dooropen','開啟房門',900,90,'#b78b63'],['doorentry','入口門',1100,120,'#755942'],['doordouble','雙扇房門',1600,90,'#b78b63'],['doorslide','推拉房門',1500,90,'#b78b63'],['doorfold','折疊門',1200,90,'#b78b63'],['doorglass','玻璃拉門',1600,70,'#b9dce9']]
  },
];
LIB.push({cat:'陽台樣式',items:[
  ['balconyutility','洗衣陽台配置',3000,1800,'#d3d8d4'],
  ['balconylounge','休憩陽台配置',3000,1800,'#9b7250'],
  ['balconygarden','植栽陽台配置',3000,1800,'#d8b88a'],
  ['bench','戶外長凳',1400,400,'#b18d65'],
  ['vanity','洗衣槽',600,500,'#eef1f3']
]});
LIB.push({cat:'空間與建築',items:[
  ['roomzone','自訂地坪／房間',3000,3000,'#ebe6dc'],
  ['wallbearing','橫向承重牆',2400,240,'#26241f'],
  ['wallbearing','直向承重牆',240,2400,'#26241f'],
  ['wallexterior','橫向外牆',2400,240,'#8f897d'],
  ['wallexterior','直向外牆',240,2400,'#8f897d'],
  ['wallpillar','方柱',400,400,'#26241f'],
  ['walllow','陽台矮欄牆',2400,120,'#a99f91']
]});
export const typeColor = t => { for (const c of LIB) for (const i of c.items) if (i[0]===t) return i[4]; return '#eee'; };
