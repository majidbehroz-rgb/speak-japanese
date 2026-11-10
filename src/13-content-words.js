// Single words, taught on their own right before the first phrase that uses them. [japanese, meaning]
// Names in swap slots are left out (NAME_WORDS): they're not vocabulary.
const WORDS={
 ohayou:["おはよう","good morning (casual)"],gozaimasu:["ございます","polite ending"],arigatou:["ありがとう","thanks (casual)"],
 hai:["はい","yes"],iie:["いいえ","no"],daijoubu:["大丈夫","fine, OK"],desu:["です","is, am, are"],
 mou:["もう","again, more"],ichido:["一度","one time","いちど"],yukkuri:["ゆっくり","slowly"],
 watashi:["私","I, me"],wa:["は","marks the topic: as for…","わ"],amerika:["アメリカ","America"],kara:["から","from"],kimashita:["来ました","came"],
 denbaa:["デンバー","Denver"],ni:["に","in, at, to"],sunde:["住んで","living"],imasu:["います","am, is (doing)"],
 shigoto:["仕事","work, job"],enjinia:["エンジニア","engineer"],ryokou:["旅行","travel, a trip"],de:["で","by, for, at"],
 yoroshiku:["よろしく","nice to meet you"],onamae:["お名前","your name"],namae:["名前","name"],nihongo:["日本語","Japanese (the language)"],sukoshi:["少し","a little"],dake:["だけ","only"],
 eigo:["英語","English (the language)"],o:["を","marks what you want or do","お"],hanasemasu:["話せます","can speak"],ka:["か","makes it a question"],
 raamen:["ラーメン","ramen"],kudasai:["ください","please (give me)"],biiru:["ビール","beer"],futatsu:["二つ","two (things)"],futari:["二人","two people"],
 no:["の","'s, of"],arimasu:["あります","there is, have"],osusume:["おすすめ","recommendation"],nan:["何","what","なん"],
 totemo:["とても","very"],oishii:["おいしい","delicious"],gochisousama:["ごちそうさま","thanks for the meal"],deshita:["でした","was"],
 ebi:["えび","shrimp"],taberaremasen:["食べられません","can't eat"],atatamete:["温めて","heat it up"],
 ikura:["いくら","how much"],sore:["それ","that (near you)"],are:["あれ","that (over there)"],miteru:["見てる","looking"],
 motto:["もっと","more"],ookii:["大きい","big"],chiisai:["小さい","small"],kuro:["黒","black","くろ"],
 shichaku:["試着","trying on (clothes)"],shite:["して","doing"],mo:["も","even, also"],ii:["いい","good, OK"],
 kaado:["カード","card"],menzei:["免税","tax-free"],dekimasu:["できます","can do"],
 eki:["駅","station"],doko:["どこ","where"],toire:["トイレ","restroom"],kono:["この","this"],densha:["電車","train"],
 shibuya:["渋谷","Shibuya"],ikimasu:["行きます","go"],"nan-ban":["何番","what number","なんばん"],sen:["線","line, platform"],
 migi:["右","right"],hidari:["左","left"],chikai:["近い","close, near"],deguchi:["出口","exit"],iriguchi:["入口","entrance"],
 chizu:["地図","map"],oshiete:["教えて","show me, tell me"],hoteru:["ホテル","hotel"],made:["まで","as far as, until"],
 tsugi:["次","next","つぎ"],shinjuku:["新宿","Shinjuku"],
 "nan-ji":["何時","what time","なんじ"],"ku-ji":["九時","nine o'clock","くじ"],kyou:["今日","today","きょう"],ashita:["明日","tomorrow","あした"],kinou:["昨日","yesterday","きのう"],
 nichiyoubi:["日曜日","Sunday"],nara:["奈良","Nara"],ikitai:["行きたい","want to go"],otera:["お寺","temple"],ga:["が","marks the thing"],
 mitai:["見たい","want to see"],akimasu:["開きます","opens","あきます"],yoyaku:["予約","reservation"],nani:["何","what","なに"],shimasu:["します","do"],
 suki:["好き","like"],shumi:["趣味","hobby"],haikingu:["ハイキング","hiking"],samui:["寒い","cold"],ne:["ね","isn't it?"],
 kirei:["きれい","beautiful, clean"],nihon:["日本","Japan","にほん"],hajimete:["初めて","the first time"],hontou:["本当","true, really"],sou:["そう","so, that way"],
 asakusa:["浅草","Asakusa"],ikimashita:["行きました","went"],tabemashita:["食べました","ate"],fujisan:["富士山","Mount Fuji"],mimashita:["見ました","saw"],
 tanoshikatta:["楽しかった","was fun"],oishikatta:["おいしかった","was delicious"],sugokatta:["すごかった","was amazing"],dou:["どう","how"],mada:["まだ","not yet"],
 "chekku-in":["チェックイン","check-in"],"chekku-auto":["チェックアウト","check-out"],nimotsu:["荷物","luggage"],azukete:["預けて","leave (with you)"],
 "wai-fai":["ワイファイ","Wi-Fi"],pasuwaado:["パスワード","password"],taoru:["タオル","towel"],arimasen:["ありません","there isn't, don't have"],
 saifu:["財布","wallet"],nakushimashita:["なくしました","lost"],kaite:["書いて","write it"],chotto:["ちょっと","a moment, a little"],matte:["待って","wait"],
 tasukete:["助けて","help"],douzo:["どうぞ","go ahead, here you are"],kibun:["気分","feeling"],warui:["悪い","bad"],byouin:["病院","hospital"],
 tokoro:["ところ","place, point"],shashin:["写真","photo"],totte:["撮って","take (a photo)"],moraemasu:["もらえます","could you (for me)"],
 omise:["お店","shop, restaurant"],
 irasshaimase:["いらっしゃいませ","welcome (to the shop)"],sanzen:["三千","three thousand","さんぜん"],en:["円","yen","えん"],"san-ban":["三番","number three","さんばん"],
 "go-ji":["五時","five o'clock","ごじ"],"juuichi-ji":["十一時","eleven o'clock","じゅういちじ"],"nan-paku":["何泊","how many nights","なんぱく"],"san-paku":["三泊","three nights","さんぱく"],fukuro:["袋","bag"],irimasu:["要ります","need"],wakarimasu:["分かります","understand"],
 jouzu:["上手","good at, skilled"],"nan-mei":["何名","how many people","なんめい"],sama:["様","(very polite) person"],"o-nomimono":["お飲み物","drinks (polite)"],
 atatamemasu:["温めます","heat up"],kochira:["こちら","this way"],e:["へ","toward","え"],pointo:["ポイント","point (reward)"],"o-shiharai":["お支払い","payment (polite)"],
 "go-yoyaku":["ご予約","reservation (polite)"],pasupooto:["パスポート","passport"],"juu-ji":["十時","ten o'clock","じゅうじ"],tennai:["店内","in the shop"],
 "o-meshiagari":["お召し上がり","eating (very polite)"],mochikaeri:["持ち帰り","to go, takeout"],mata:["また","again"],osewa:["お世話","care, help"],narimashita:["なりました","became, received"]
};
// words taught alongside a phrase because the week's conversation uses them before any phrase does
const TEACH_WITH={"Daijoubu desu":["ka"],"Ikura desu ka?":["sanzen","en"],"Nan-ban sen desu ka?":["san-ban"],"Nan-ji desu ka?":["go-ji"],"Chekku-auto wa nan-ji desu ka?":["juuichi-ji"],"Chekku-in onegaishimasu":["nan-paku","san-paku"]};
const NAME_WORDS=new Set(["ken","ken-san","sumisu"]);
const wordTok=s=>s.replace(/\([^)]*\)/g," ").replace(/[\[\]]/g,"").replace(/[·.,!?…\/]/g," ").split(/\s+/).map(t=>t.toLowerCase()).filter(Boolean);
// the phrase (deck id) where each word is first taught, in course order
const WORD_FIRST=(()=>{const m={};const set=(t,id)=>{if(!(t in m))m[t]=(id&&WORDS[t]&&!NAME_WORDS.has(t))?id:null};
  WEEKS.forEach((W,w)=>{
    W.phrases.forEach((p,i)=>{const t=wordTok(p[0]);(TEACH_WITH[p[0]]||[]).forEach(x=>set(x,w+"-"+i));t.forEach(x=>set(x,t.length<2?null:w+"-"+i))});       // days 1-2
    wordsFor(w).forEach(x=>wordTok(x.ro).forEach(t=>set(t,null)));                                         // day 3: taught as words
    (STAFF[w]||[]).forEach((x,k)=>{const reply=x[3]&&!x[3].startsWith("(")?x[3]:"";const one=wordTok(x[0]).length<2;wordTok(x[0]).forEach(t=>set(t,one?null:w+"-s"+k));wordTok(reply).forEach(t=>set(t,w+"-s"+k))})}); // day 5
  return m})();
// new single words to teach before phrase id (in phrase order)
function newWordsFor(id,ro){const out=[];wordTok(ro).concat(TEACH_WITH[ro]||[]).forEach(t=>{if(WORD_FIRST[t]===id&&!out.some(o=>o.ro===t))out.push({ro:t,jp:WORDS[t][0],en:WORDS[t][1],say:WORDS[t][2]||WORDS[t][0]})});return out}

const NUM_WORDS=/^(ichi|ni|san|yon|go|roku|nana|hachi|kyuu|juu|hyaku|sen|man|ji|fun|pun|han)$/;
function knownTokens(extraIds){const s=new Set(),add=c=>{if(!c)return;wordTok(c.ro).concat(TEACH_WITH[c.ro]||[]).forEach(t=>s.add(t));if(c.staff&&c.reply&&!c.reply.startsWith("("))wordTok(c.reply).forEach(t=>s.add(t))};
  learnedIds().forEach(id=>add(byId(id)));staffKnown().forEach(id=>add(byId(id)));(extraIds||[]).forEach(id=>add(byId(id)));return s}
const lineKnown=(ro,known)=>wordTok(String(ro).replace(/\{[^}]*\}/g," ")).every(t=>known.has(t)||NAME_WORDS.has(t)||NUM_WORDS.test(t)||/^\d/.test(t));

