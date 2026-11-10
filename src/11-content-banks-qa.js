// swap-word banks: [romaji, japanese, english]
const KNUM=["","一","二","三","四","五","六","七","八","九","十","十一","十二"];
const HOURK=["","いち","に","さん","よ","ご","ろく","しち","はち","く","じゅう","じゅういち","じゅうに"],HOURR=["","ichi","ni","san","yo","go","roku","shichi","hachi","ku","juu","juuichi","juuni"];
const BANK={
 ask:[["kore","これ","this (what I'm holding)"],["mizu","水","water"],["menyuu","メニュー","the menu"],["okaikei","お会計","the check"],["reshiito","レシート","a receipt"],["fukuro","袋","a bag"],["ohashi","お箸","chopsticks"],["fooku","フォーク","a fork"],["chizu","地図","a map"]],
 origin:[["Amerika","アメリカ","America"],["Denbaa","デンバー","Denver"],["Nyuuyooku","ニューヨーク","New York"],["Kariforunia","カリフォルニア","California"],["Tekisasu","テキサス","Texas"],["Furorida","フロリダ","Florida"],["Kanada","カナダ","Canada"]],
 job:[["enjinia","エンジニア","engineer"],["puroguramaa","プログラマー","programmer"],["sensei","先生","teacher"],["gakusei","学生","student"],["isha","医者","doctor"],["kangoshi","看護師","nurse"],["kaishain","会社員","office worker"],["bengoshi","弁護士","lawyer"],["dezainaa","デザイナー","designer"],["keieisha","経営者","business owner"]],
 food:[["raamen","ラーメン","ramen"],["sushi","寿司","sushi"],["tenpura","天ぷら","tempura"],["yakitori","焼き鳥","yakitori"],["udon","うどん","udon"],["gyouza","餃子","gyoza"],["karee","カレー","curry"],["okonomiyaki","お好み焼き","okonomiyaki"],["tonkatsu","とんかつ","pork cutlet"],["onigiri","おにぎり","rice balls"]],
 drink:[["biiru","ビール","beer"],["mizu","水","water"],["ocha","お茶","green tea"],["koohii","コーヒー","coffee"],["osake","お酒","sake"],["juusu","ジュース","juice"]],
 count:[["hitotsu","一つ","one"],["futatsu","二つ","two"],["mittsu","三つ","three"]],
 thing:[["kore","これ","this"],["sore","それ","that"],["kono Tii-shatsu","このTシャツ","this T-shirt"],["kono kaban","このかばん","this bag"],["kono kutsu","この靴","these shoes"],["kono kasa","この傘","this umbrella"],["kono omiyage","このお土産","this souvenir"],["chiketto","チケット","a ticket"]],
 color:[["kuro","黒","black"],["shiro","白","white"],["aka","赤","red"],["ao","青","blue"],["midori","緑","green"],["chairo","茶色","brown"]],
 size:[["ookii","大きい","bigger"],["chiisai","小さい","smaller"],["yasui","安い","cheaper"]],
 place:[["eki","駅","station"],["toire","トイレ","restroom"],["hoteru","ホテル","hotel"],["konbini","コンビニ","convenience store"],["ginkou","銀行","bank"],["yakkyoku","薬局","pharmacy"],["deguchi","出口","exit"],["basutei","バス停","bus stop"],["kuukou","空港","airport"],["chikatetsu","地下鉄","subway"]],
 city:[["Toukyou","東京","Tokyo"],["Kyouto","京都","Kyoto"],["Oosaka","大阪","Osaka"],["Shibuya","渋谷","Shibuya"],["Shinjuku","新宿","Shinjuku"],["Asakusa","浅草","Asakusa"],["Nara","奈良","Nara"],["Hiroshima","広島","Hiroshima"],["Hakone","箱根","Hakone"],["Ueno","上野","Ueno"]],
 sight:[["otera","お寺","temples"],["jinja","神社","a shrine"],["oshiro","お城","a castle"],["Fujisan","富士山","Mt. Fuji"],["kouen","公園","a park"],["hakubutsukan","博物館","a museum"],["onsen","温泉","a hot spring"],["ichiba","市場","a market"]],
 hour:HOURK.slice(1).map((k,i)=>[HOURR[i+1]+"-ji",KNUM[i+1]+"時",(i+1)+" o'clock"]),
 day:[["getsuyoubi","月曜日","Monday"],["kayoubi","火曜日","Tuesday"],["suiyoubi","水曜日","Wednesday"],["mokuyoubi","木曜日","Thursday"],["kinyoubi","金曜日","Friday"],["doyoubi","土曜日","Saturday"],["nichiyoubi","日曜日","Sunday"]],
 hobby:[["haikingu","ハイキング","hiking"],["ryouri","料理","cooking"],["ongaku","音楽","music"],["eiga","映画","movies"],["dokusho","読書","reading"],["ryokou","旅行","travel"],["kyanpu","キャンプ","camping"],["shashin","写真","photography"],["geemu","ゲーム","video games"],["supootsu","スポーツ","sports"]],
 past:[["oishikatta","おいしかった","delicious"],["tanoshikatta","楽しかった","fun"],["samukatta","寒かった","cold"],["takakatta","高かった","expensive"],["yasukatta","安かった","cheap"],["omoshirokatta","面白かった","interesting"],["yokatta","よかった","good"],["sugokatta","すごかった","amazing"]],
 item:[["taoru","タオル","towel"],["sekken","石鹸","soap"],["kagi","鍵","key"],["rimokon","リモコン","remote"],["denki","電気","light"],["oyu","お湯","hot water"],["Wai-fai","Wi-Fi","Wi-Fi"],["eakon","エアコン","air conditioner"]],
 lost:[["saifu","財布","wallet"],["pasupooto","パスポート","passport"],["keitai","携帯","phone"],["kaban","かばん","bag"],["kippu","切符","ticket"],["kasa","傘","umbrella"]]};
const BANK_NAMES={ask:"Things to ask for",origin:"Where you're from",job:"Jobs",food:"Food",drink:"Drinks",count:"Counting",thing:"Things in a shop",color:"Colors",size:"Sizes",place:"Places",city:"Cities and areas",sight:"Sights",hour:"Hours",day:"Days of the week",hobby:"Hobbies",past:"How it was (past)",item:"Things in a hotel room",lost:"Things you might lose"};

// questions people will ask you: {w, q:[ro,jp,en], a:[ro,jp,en]}; {name} etc. come from Your answers
const QA=[
 {w:0,q:["Daijoubu desu ka?","大丈夫ですか？","Are you OK? / Is that OK?"],a:["Hai, daijoubu desu.","はい、大丈夫です。","Yes, I'm fine."]},
 {w:0,q:["Daijoubu desu ka?","大丈夫ですか？","Is that OK?"],a:["Hai, arigatou gozaimasu.","はい、ありがとうございます。","Yes, thank you."]},
 {w:0,q:["Daijoubu desu ka? Daijoubu desu ka?","大丈夫ですか？大丈夫ですか？","Are you OK? Are you OK? (said fast)"],a:["Sumimasen, wakarimasen. Mou ichido onegaishimasu.","すみません、分かりません。もう一度お願いします。","Sorry, I don't understand. Once more, please."]},
 {w:1,q:["Nihongo o hanasemasu ka?","日本語を話せますか？","Can you speak Japanese?"],a:["Sukoshi dake desu.","少しだけです。","Only a little."]},
 {w:1,q:["Onamae wa?","お名前は？","Your name?"],a:["{name} desu.","{name}です。","I'm {name}."]},
 {w:1,q:["Amerika kara kimashita ka?","アメリカから来ましたか？","Are you from America?"],a:["Hai, {origin} kara kimashita.","はい、{origin}から来ました。","Yes, I'm from {origin}."]},
 {w:1,q:["Shigoto wa?","仕事は？","Your job?"],a:["Shigoto wa {job} desu.","仕事は{job}です。","My job is {job}."]},
 {w:1,q:["Eigo o hanasemasu ka?","英語を話せますか？","Do you speak English?"],a:["Hai. Nihongo wa sukoshi dake desu.","はい。日本語は少しだけです。","Yes. I only speak a little Japanese."]},
 {w:1,q:["Ryokou desu ka?","旅行ですか？","Are you traveling?"],a:["Hai, ryokou desu.","はい、旅行です。","Yes, I'm traveling."]},
 {w:2,q:["Nan-mei sama desu ka?","何名様ですか？","How many people?"],a:["Futari desu.","二人です。","Two."]},
 {w:2,q:["Osusume wa raamen desu.","おすすめはラーメンです。","We recommend the ramen."],a:["{food} o kudasai.","{food}をください。","{food}, please."]},
 {w:2,q:["Futari desu ka?","二人ですか？","Two people?"],a:["Hai, futari desu.","はい、二人です。","Yes, two."]},
 {w:2,q:["Oishii desu ka?","おいしいですか？","Is it good?"],a:["Hai, totemo oishii desu!","はい、とてもおいしいです！","Yes, it's very good!"]},
 {w:2,q:["Futatsu desu ka?","二つですか？","Two of them?"],a:["Hai, futatsu desu.","はい、二つです。","Yes, two."]},
 {w:3,q:["Kore desu ka?","これですか？","This one?"],a:["Iie, daijoubu desu.","いいえ、大丈夫です。","No, I'm fine."]},
 {w:3,q:["Sanzen en desu.","三千円です。","It's 3,000 yen."],a:["Kaado de ii desu ka?","カードでいいですか？","Is a card OK?"]},
 {w:3,q:["Motto ookii no desu ka?","もっと大きいのですか？","A bigger one?"],a:["Hai, motto ookii no wa arimasu ka?","はい、もっと大きいのはありますか？","Yes, do you have a bigger one?"]},
 {w:3,q:["Shichaku shimasu ka?","試着しますか？","Would you like to try it on?"],a:["Hai, onegaishimasu.","はい、お願いします。","Yes, please."]},
 {w:3,q:["Kore wa ii desu ka?","これはいいですか？","Is this one OK?"],a:["Hai, kore o kudasai.","はい、これをください。","Yes, I'll take this."]},
 {w:4,q:["Doko ni ikimasu ka?","どこに行きますか？","Where are you going?"],a:["{city} ni ikimasu.","{city}に行きます。","I'm going to {city}."]},
 {w:4,q:["Doko made desu ka?","どこまでですか？","Where to?"],a:["Eki made onegaishimasu.","駅までお願いします。","To the station, please."]},
 {w:4,q:["Daijoubu desu ka?","大丈夫ですか？","Are you OK?"],a:["Sumimasen, eki wa doko desu ka?","すみません、駅はどこですか？","Excuse me, where is the station?"]},
 {w:5,q:["Ashita wa nani o shimasu ka?","明日は何をしますか？","What are you doing tomorrow?"],a:["{city} ni ikimasu.","{city}に行きます。","I'm going to {city}."]},
 {w:5,q:["Nan-ji ni ikimasu ka?","何時に行きますか？","What time are you going?"],a:["Ku-ji ni ikimasu.","九時に行きます。","At nine."]},
 {w:5,q:["Nan-ji made desu ka?","何時までですか？","Until what time?"],a:["Go-ji made desu.","五時までです。","Until five."]},
 {w:5,q:["Nani ga mitai desu ka?","何が見たいですか？","What do you want to see?"],a:["Otera ga mitai desu.","お寺が見たいです。","I want to see temples."]},
 {w:6,q:["Nihon wa hajimete desu ka?","にほんは初めてですか？","First time in Japan?"],a:["Hai, hajimete desu.","はい、初めてです。","Yes, it's my first time."]},
 {w:6,q:["Sushi wa suki desu ka?","寿司は好きですか？","Do you like sushi?"],a:["Hai! {food} ga suki desu.","はい！{food}が好きです。","Yes! I like {food}."]},
 {w:6,q:["Shumi wa nan desu ka?","趣味はなんですか？","What's your hobby?"],a:["{hobby} desu.","{hobby}です。","{hobby}."]},
 {w:6,q:["Samui desu ne.","寒いですね。","Cold, isn't it?"],a:["Sou desu ne!","そうですね！","It sure is!"]},
 {w:6,q:["Doko ni sunde imasu ka?","どこに住んでいますか？","Where do you live?"],a:["{origin} ni sunde imasu.","{origin}に住んでいます。","I live in {origin}."]},
 {w:7,q:["Kinou wa doko ni ikimashita ka?","昨日はどこに行きましたか？","Where did you go yesterday?"],a:["{city} ni ikimashita.","{city}に行きました。","I went to {city}."]},
 {w:7,q:["Dou deshita ka?","どうでしたか？","How was it?"],a:["Tanoshikatta desu!","楽しかったです！","It was fun!"]},
 {w:7,q:["Nani o tabemashita ka?","何を食べましたか？","What did you eat?"],a:["{food} o tabemashita. Oishikatta desu.","{food}を食べました。おいしかったです。","I ate {food}. It was delicious."]},
 {w:7,q:["Mou {city} ni ikimashita ka?","もう{city}に行きましたか？","Have you been to {city} yet?"],a:["Mada desu.","まだです。","Not yet."]},
 {w:8,q:["Yoyaku wa?","予約は？","Do you have a reservation?"],a:["Hai. Yoyaku shite imasu. {name} desu.","はい。予約しています。{name}です。","Yes. I have a reservation, under {name}."]},
 {w:8,q:["Pasupooto o onegaishimasu.","パスポートをお願いします。","Your passport, please."],a:["Hai, douzo.","はい、どうぞ。","Here you go."]},
 {w:8,q:["Nan-paku desu ka?","何泊ですか？","How many nights?"],a:["San-paku desu.","三泊です。","Three nights."]},
 {w:8,q:["Chekku-auto wa juuichi-ji desu.","チェックアウトは十一時です。","Check-out is at 11."],a:["Wakarimashita. Arigatou gozaimasu.","分かりました。ありがとうございます。","Got it. Thank you."]},
 {w:9,q:["Nihon wa dou desu ka?","にほんはどうですか？","How do you like Japan?"],a:["Sugoi desu! Totemo kirei desu.","すごいです！とてもきれいです。","It's amazing! It's very beautiful."]},
 {w:9,q:["Nihon wa dou desu ka?","にほんはどうですか？","How is Japan?"],a:["Hai! Mata Nihon ni ikitai desu.","はい！またにほんに行きたいです。","Yes! I want to go to Japan again."]}];

const INTRO=[["Hajimemashite. {name} desu.","はじめまして。{name}です。","Nice to meet you. I'm {name}."],["{origin} kara kimashita.","{origin}から来ました。","I'm from {origin}."],["Shigoto wa {job} desu.","仕事は{job}です。","My job is {job}."],["Shumi wa {hobby} desu.","趣味は{hobby}です。","My hobby is {hobby}."],["{food} ga suki desu.","{food}が好きです。","I like {food}."],["{city} ni ikitai desu.","{city}に行きたいです。","I want to go to {city}."],["Yoroshiku onegaishimasu.","よろしくお願いします。","Pleased to meet you."]];


// what you should be able to do at the end of each week (the Sunday self-check)
const CANDO=[
 ["Greet, thank and apologize politely","Say I don't understand and ask someone to repeat slowly"],
 ["Introduce yourself: name, where you're from, job, why you're here","Count 1 to 5 and understand them when you hear them"],
 ["Order food and drinks for a table","Ask what's recommended and ask for the check","Say a food you can't eat","Count 1 to 10, and say any number up to 99"],
 ["Ask how much something is and understand the price","Ask for another size or color and pay by card"],
 ["Ask where a place is and follow straight / left / right","Ask whether a train goes to a place"],
 ["Say what time it is and what you're doing tomorrow","Say what you want to do or see"],
 ["Say what you like and ask the other person back","React naturally: sou desu ne, hontou?, sugoi"],
 ["Say where you went and what you ate","Say how something was"],
 ["Check in to a hotel and ask about check-out","Report a missing item or a lost thing and ask for help","Say you feel sick and ask for a hospital"],
 ["Give your full introduction without notes","Answer 10 random questions with the text hidden"]];
const KANA_WORDS=[["コーヒー","koohii","coffee"],["ビール","biiru","beer"],["ラーメン","raamen","ramen"],["カレー","karee","curry"],["ケーキ","keeki","cake"],["パン","pan","bread"],["ジュース","juusu","juice"],["ワイン","wain","wine"],["サラダ","sarada","salad"],["メニュー","menyuu","menu"],["セット","setto","set meal"],["アイス","aisu","ice cream"],["チーズ","chiizu","cheese"],["ハンバーガー","hanbaagaa","hamburger"],["ホテル","hoteru","hotel"],["タクシー","takushii","taxi"],["トイレ","toire","toilet"],["コンビニ","konbini","convenience store"],["カード","kaado","card"],["エレベーター","erebeetaa","elevator"]];
