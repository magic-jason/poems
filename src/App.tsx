import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Image as ImageIcon, BookOpen, Loader2, Search, Key, Settings, History, Music, VolumeX, Volume2 } from 'lucide-react';
import CanvasOverlay from './components/CanvasOverlay';
import SettingsModal, { shouldOpenSettingsGate } from './components/SettingsModal';
import { analyzePoem, generateImage, PoemAnalysis } from './services/gemini';
import { type AppSettings, isAppConfiguredForUse, isDesktopRuntime, isSettingsSatisfiedForModel, loadSettings, normalizeModelType, saveSettings } from './services/desktop';
import { StudyCard } from './components/StudyCard';
import { toPng } from 'html-to-image';

const POEMS = [
  { title: "池上", author: "白居易", dynasty: "唐", content: "小娃撑小艇，偷采白莲回。不解藏踪迹，浮萍一道开。" },
  { title: "村夜", author: "白居易", dynasty: "唐", content: "霜草苍苍虫切切，村南村北行人绝。独出门前望野田，月明荞麦花如雪。" },
  { title: "大林寺桃花", author: "白居易", dynasty: "唐", content: "人间四月芳菲尽，山寺桃花始盛开。长恨春归无觅处，不知转入此中来。" },
  { title: "赋得古原草送别", author: "白居易", dynasty: "唐", content: "离离原上草，一岁一枯荣。野火烧不尽，春风吹又生。远芳侵古道，晴翠接荒城。又送王孙去，萋萋满别情。" },
  { title: "暮江吟", author: "白居易", dynasty: "唐", content: "一道残阳铺水中，半江瑟瑟半江红。可怜九月初三夜，露似真珠月似弓。" },
  { title: "问刘十九", author: "白居易", dynasty: "唐", content: "绿蚁新醅酒，红泥小火炉。晚来天欲雪，能饮一杯无？" },
  { title: "夜雪", author: "白居易", dynasty: "唐", content: "已讶衾枕冷，复见窗户明。夜深知雪重，时闻折竹声。" },
  { title: "遗爱寺", author: "白居易", dynasty: "唐", content: "弄石临溪坐，寻花绕寺行。时时闻鸟语，处处是泉声。" },
  { title: "忆江南", author: "白居易", dynasty: "唐", content: "江南好，风景旧曾谙。日出江花红胜火，春来江水绿如蓝。能不忆江南？" },
  { title: "春夜喜雨", author: "杜甫", dynasty: "唐", content: "好雨知时节，当春乃发生。随风潜入夜，润物细无声。野径云俱黑，江船火独明。晓看红湿处，花重锦官城。" },
  { title: "江南逢李龟年", author: "杜甫", dynasty: "唐", content: "岐王宅里寻常见，崔九堂前几度闻。正是江南好风景，落花时节又逢君。" },
  { title: "江畔独步寻花其五", author: "杜甫", dynasty: "唐", content: "黄师塔前江水东，春光懒困倚微风。桃花一簇开无主，可爱深红爱浅红？" },
  { title: "江畔独步寻花其六", author: "杜甫", dynasty: "唐", content: "黄四娘家花满蹊，千朵万朵压枝低。留连戏蝶时时舞，自在娇莺恰恰啼。" },
  { title: "绝句", author: "一", dynasty: "唐", content: "迟日江山丽，春风花草香。泥融飞燕子，沙暖睡鸳鸯。" },
  { title: "绝句", author: "二", dynasty: "唐", content: "江碧鸟逾白，山青花欲燃。今春看又过，何日是归年。" },
  { title: "前出塞其六", author: "杜甫", dynasty: " 唐 ", content: "挽弓当挽强，用箭当用长。射人先射马，擒贼先擒王。杀人亦有限，列国自有疆。苟能制侵陵，岂在多杀伤。" },
  { title: "水槛遣心二首", author: "杜甫", dynasty: " 唐 ", content: "去郭轩楹敞，无村眺望赊。澄江平少岸，幽树晚多花。细雨鱼儿出，微风燕子斜。城中十万户，此地两三家。蜀天常夜雨，江槛已朝晴。叶润林塘密，衣干枕席清。不堪祗老病，何得尚浮名。浅把涓涓酒，深凭送此生。" },
  { title: "望岳", author: "杜甫", dynasty: "唐", content: "岱宗夫如何，齐鲁青未了。造化钟神秀，阴阳割昏晓。荡胸生曾云，决眦入归鸟。会当凌绝顶，一览众山小。" },
  { title: "十五夜望月寄杜郎中", author: "王建", dynasty: "唐", content: "中庭地白树栖鸦，冷露无声湿桂花。今夜月明人尽望，不知秋思落谁家。" },
  { title: "闻官军收河南河北", author: "杜甫", dynasty: "唐", content: "剑外忽传收蓟北，初闻涕泪满衣裳。却看妻子愁何在，漫卷诗书喜欲狂。白日放歌须纵酒，青春作伴好还乡。即从巴峡穿巫峡，便下襄阳向洛阳。" },
  { title: "赠花卿", author: "杜甫", dynasty: " 唐 ", content: "锦城丝管日纷纷，半入江风半入云。此曲只应天上有，人间能得几回闻。" },
  { title: "独坐敬亭山", author: "李白", dynasty: "唐", content: "众鸟高飞尽，孤云独去闲。相看两不厌，只有敬亭山。" },
  { title: "古朗月行", author: "李白", dynasty: "唐", content: "小时不识月，呼作白玉盘。又疑瑶台镜，飞在青云端。仙人垂两足，桂树何团团。白兔捣药成，问言与谁餐？蟾蜍蚀圆影，大明夜已残。羿昔落九乌，天人清且安。阴精此沦惑，去去不足观。忧来其如何？凄怆摧心肝。" },
  { title: "黄鹤楼送孟浩然之广陵", author: "李白", dynasty: "唐", content: "故人西辞黄鹤楼，烟花三月下扬州。孤帆远影碧空尽，唯见长江天际流。" },
  { title: "将进酒", author: "李白", dynasty: "唐", content: "君不见，黄河之水天上来，奔流到海不复回。君不见，高堂明镜悲白发，朝如青丝暮成雪。人生得意须尽欢，莫使金樽空对月。天生我材必有用，千金散尽还复来。烹羊宰牛且为乐，会须一饮三百杯。岑夫子，丹丘生，将进酒，杯莫停。与君歌一曲，请君为我倾耳听。钟鼓馔玉不足贵，但愿长醉不愿醒。古来圣贤皆寂寞，惟有饮者留其名。陈王昔时宴平乐，斗酒十千恣欢谑。主人何为言少钱，径须沽取对君酌。五花马，千金裘，呼儿将出换美酒，与尔同销万古愁。" },
  { title: "静夜思", author: "李白", dynasty: "唐", content: "床前明月光，疑是地上霜。举头望明月，低头思故乡。" },
  { title: "客中作", author: "李白", dynasty: " 唐 ", content: "兰陵美酒郁金香，玉碗盛来琥珀光。但使主人能醉客，不知何处是他乡。" },
  { title: "秋浦歌其十五", author: "李白", dynasty: "唐", content: "白发三千丈，缘愁似个长。不知明镜里，何处得秋霜。" },
  { title: "望庐山瀑布", author: "李白", dynasty: "唐", content: "日照香炉生紫烟，遥看瀑布挂前川。飞流直下三千尺，疑是银河落九天。" },
  { title: "望天门山", author: "李白", dynasty: "唐", content: "天门中断楚江开，碧水东流至此回。两岸青山相对出，孤帆一片日边来。" },
  { title: "夜宿山寺", author: "李白", dynasty: "唐", content: "危楼高百尺，手可摘星辰。不敢高声语，恐惊天上人。" },
  { title: "早发白帝城", author: "李白", dynasty: "唐", content: "朝辞白帝彩云间，千里江陵一日还。两岸猿声啼不住，轻舟已过万重山。" },
  { title: "赠汪伦", author: "李白", dynasty: "唐", content: "李白乘舟将欲行，忽闻岸上踏歌声。桃花潭水深千尺，不及汪伦送我情。" },
  { title: "子夜吴歌.秋歌", author: "李白", dynasty: "唐", content: "长安一片月，万户捣衣声。秋风吹不尽，总是玉关情。何日平胡虏，良人罢远征。" },
  { title: "浪淘沙", author: "刘禹锡", dynasty: "唐", content: "九曲黄河万里沙，浪淘风簸自天涯。如今直上银河去，同到牵牛织女家。" },
  { title: "望洞庭", author: "刘禹锡", dynasty: "唐", content: "湖光秋月两相和，潭面无风镜未磨。遥望洞庭山水翠，白银盘里一青螺。" },
  { title: "冬夜读书示子聿", author: "陆游", dynasty: " 宋 ", content: "古人学问无遗力，少壮工夫老始成。纸上得来终觉浅，绝知此事要躬行。" },
  { title: "秋夜将晓出篱门迎凉有感", author: "陆游", dynasty: "宋", content: "三万里河东入海，五千仞岳上摩天。遗民泪尽胡尘里，南望王师又一年。" },
  { title: "示儿", author: "陆游", dynasty: "宋", content: "死去元知万事空，但悲不见九州同。王师北定中原日，家祭无忘告乃翁。" },
  { title: "咏鹅", author: "骆宾王", dynasty: "唐", content: "鹅，鹅，鹅，曲项向天歌。白毛浮绿水，红掌拨清波。" },
  { title: "于易水送人", author: "骆宾王", dynasty: " 唐 ", content: "此地别燕丹，壮士发冲冠。昔时人已没，今日水犹寒。" },
  { title: "沁园春.雪", author: "毛泽东", dynasty: "近", content: "北国风光，千里冰封，万里雪飘。望长城内外，惟余莽莽；大河上下，顿失滔滔。山舞银蛇，原驰蜡象，欲与天公试比高。须晴日，看红装素裹，分外妖娆。的冰雪交相辉映，分外美好。江山如此多娇，引无数英雄竞折腰。惜秦皇汉武，略输文采；唐宗宋祖，稍逊风骚。一代天骄，成吉思汗，只识弯弓射大雕。俱往矣，数风流人物，还看今朝。" },
  { title: "沁园春.长沙", author: "毛泽东", dynasty: "现", content: "独立寒秋，湘江北去，橘子洲头。看万山红遍，层林尽染；漫江碧透，百舸争流。鹰击长空，鱼翔浅底，万类霜天竞自由。怅寥廓，问苍茫大地，谁主沉浮？携来百侣曾游，忆往昔峥嵘岁月稠。恰同学少年，风华正茂；书生意气，挥斥方遒指点江山，激扬文字，粪土当年万户侯。曾记否，到中流击水，浪遏飞舟？" },
  { title: "春晓", author: "孟浩然", dynasty: "唐", content: "春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。" },
  { title: "宿建德江", author: "孟浩然", dynasty: "唐", content: "移舟泊烟渚，日暮客愁新。野旷天低树，江清月近人。" },
  { title: "登鹳雀楼", author: "王之涣", dynasty: "唐", content: "白日依山尽，黄河入海流。欲穷千里目，更上一层楼。" },
  { title: "凉州词", author: "王之涣", dynasty: "唐", content: "黄河远上白云间，一片孤城万仞山。羌笛何须怨杨柳，春风不度玉门关。" },
  { title: "过分水岭", author: "温庭筠", dynasty: " 唐 ", content: "溪水无情似有情，入山三日得同行。岭头便是分头处，惜别潺湲一夜声。" },
  { title: "商山早行", author: "温庭筠", dynasty: "唐", content: "晨起动征铎，客行悲故乡。鸡声茅店月，人迹板桥霜。槲叶落山路，枳花明驿墙。因思杜陵梦，凫雁满回塘。" },
  { title: "菩萨蛮.书江西造口壁", author: "辛弃疾", dynasty: " 宋 ", content: "郁孤台下清江水，中间多少行人泪。西北望长安，可怜无数山。青山遮不住，毕竟东流去。江晚正愁余①，山深闻鹧鸪。" },
  { title: "清平乐.村居", author: "辛弃疾", dynasty: "宋", content: "茅檐低小，溪上青青草。醉里吴音相媚好，白发谁家翁媪？大儿锄豆溪东，中儿正织鸡笼。最喜小儿亡赖，溪头卧剥莲蓬。" },
  { title: "初秋行圃", author: "杨万里", dynasty: " 宋 ", content: "落日无情最有情，遍催万树暮蝉鸣。听来咫尺无寻处，寻到旁边却不声。初秋在园子里散步" },
  { title: "过松源晨炊漆公店", author: "杨万里", dynasty: "宋", content: "莫言下岭便无难，赚得行人错喜欢。政入万山围子里，一山放出一山拦。" },
  { title: "小池", author: "杨万里", dynasty: "宋", content: "泉眼无声惜细流，树阴照水爱晴柔。小荷才露尖尖角，早有蜻蜓立上头。" },
  { title: "晓出净慈寺送林子方", author: "杨万里", dynasty: "宋", content: "毕竟西湖六月中，风光不与四时同。接天莲叶无穷碧，映日荷花别样红。" },
  { title: "西江月.夜行黄沙道中", author: "辛弃疾", dynasty: "宋", content: "明月别枝惊鹊，清风半夜鸣蝉。稻花香里说丰年，听取蛙声一片。七八个星天外，两三点雨山前。旧时茅店社林边，路转溪桥忽见。" },
  { title: "新柳", author: "杨万里", dynasty: " 宋 ", content: "柳条百尺拂银塘，且莫深青只浅黄。未必柳条能蘸水，水中柳影引他长。" },
  { title: "宿新市徐公店", author: "杨万里", dynasty: "宋", content: "篱落疏疏一径深，树头新绿未成阴。儿童急走追黄蝶，飞入菜花无处寻。" },
  { title: "稚子弄冰", author: "杨万里", dynasty: "宋", content: "稚子金盆脱晓冰，彩丝穿取当银钲。敲成玉磬穿林响，忽作玻璃碎地声。" },
  { title: "夜书所见", author: "叶绍翁", dynasty: "宋", content: "萧萧梧叶送寒声，江上秋风动客情。知有儿童挑促织，夜深篱落一灯明。" },
  { title: "游园不值", author: "叶绍翁", dynasty: "宋", content: "应怜屐齿印苍苔，小扣柴扉久不开。春色满园关不住，一枝红杏出墙来。" },
  { title: "所见", author: "袁枚", dynasty: "清", content: "牧童骑黄牛，歌声振林樾。意欲捕鸣蝉，忽然闭口立。" },
  { title: "苔", author: "袁枚", dynasty: " 清 ", content: "白日不到处，青春恰自来。苔花如米小，也学牡丹开。" },
  { title: "春日", author: "朱熹", dynasty: "宋", content: "胜日寻芳泗水滨，无边光景一时新。等闲识得东风面，万紫千红总是春。" },
  { title: "观书有感其一", author: "朱熹", dynasty: "宋", content: "半亩方塘一鉴开，天光云影共徘徊。问渠那得清如许，为有源头活水来。" },
  { title: "天净沙.春", author: "白朴", dynasty: " 元 ", content: "春山暖日和风，阑干楼阁帘栊，杨柳秋千院中。啼莺舞燕，小桥流水飞红。" },
  { title: "敕勒歌", author: "北朝民歌", dynasty: "南北朝", content: "敕勒川，阴山下。天似穹庐，笼盖四野。天苍苍，野茫茫。风吹草低见牛羊。" },
  { title: "七步诗", author: "曹植", dynasty: "未知", content: "煮豆燃豆萁，豆在釜中泣。本是同根生，相煎何太急？" },
  { title: "三衢道中", author: "曾几", dynasty: "宋", content: "梅子黄时日日晴，小溪泛尽却山行。绿阴不减来时路，添得黄鹂四五声。" },
  { title: "舟夜书所见", author: "查慎行", dynasty: "清", content: "月黑见渔灯，孤光一点萤。微微风簇浪，散作满河星。" },
  { title: "一字诗", author: "陈沆", dynasty: " 清 ", content: "一帆一桨一渔舟，一个渔翁一钓钩。一俯一仰一场笑，一江明月一江秋。" },
  { title: "溪上遇雨其二", author: "崔道融", dynasty: " 唐 ", content: "坐看黑云衔猛雨，喷洒前山此独晴。忽惊云雨在头上，却是山前晚照明。" },
  { title: "乌衣巷", author: "刘禹锡", dynasty: "唐", content: "朱雀桥边野草花，乌衣巷口夕阳斜。旧时王谢堂前燕，飞入寻常百姓家。" },
  { title: "竹枝词其一", author: "刘禹锡", dynasty: "唐", content: "杨柳青青江水平，闻郎江上唱歌声。东边日出西边雨，道是无晴却有晴。" },
  { title: "海棠", author: "苏轼", dynasty: " 宋 ", content: "东风袅袅泛崇光，香雾空蒙月转廊。只恐夜深花睡去，故烧高烛照红妆。" },
  { title: "惠崇春江晚景其一", author: "苏轼", dynasty: "宋", content: "竹外桃花三两枝，春江水暖鸭先知。蒌蒿满地芦芽短，正是河豚欲上时。" },
  { title: "惠崇春江晚景其二", author: "苏轼", dynasty: "宋", content: "两两归鸿欲破群，依依还似北归人。遥知朔漠多风雪，更待江南半月春。" },
  { title: "六月二十七日望湖楼醉书", author: "苏轼", dynasty: "宋", content: "黑云翻墨未遮山，白雨跳珠乱入船。卷地风来忽吹散，望湖楼下水如天。" },
  { title: "题西林壁", author: "苏轼", dynasty: "宋", content: "横看成岭侧成峰，远近高低各不同。不识庐山真面目，只缘身在此山中。" },
  { title: "饮湖上初晴后雨", author: "苏轼", dynasty: "宋", content: "水光潋滟晴方好，山色空蒙雨亦奇。欲把西湖比西子，淡妆浓抹总相宜。" },
  { title: "北陂杏花", author: "王安石", dynasty: " 宋 ", content: "一陂春水绕花身，花影妖娆各占春。纵被春风吹作雪，绝胜南陌碾成尘。" },
  { title: "泊船瓜洲", author: "王安石", dynasty: "未知", content: "京口瓜洲一水间，钟山只隔数重山。春风又绿江南岸，明月何时照我还。" },
  { title: "梅花", author: "王安石", dynasty: "宋", content: "墙角数枝梅，凌寒独自开。遥知不是雪，为有暗香来。" },
  { title: "书湖阴先生壁", author: "王安石", dynasty: "未知", content: "茅檐长扫净无苔，花木成畦手自栽。一水护田将绿绕，两山排闼送青来。" },
  { title: "元日", author: "王安石", dynasty: "宋", content: "爆竹声中一岁除，春风送暖入屠苏。千门万户曈曈日，总把新桃换旧符。" },
  { title: "采莲曲", author: "王昌龄", dynasty: "唐", content: "荷叶罗裙一色裁，芙蓉向脸两边开。乱入池中看不见，闻歌始觉有人来。" },
  { title: "出塞", author: "王昌龄", dynasty: "唐", content: "秦时明月汉时关，万里长征人未还。但使龙城飞将在，不教胡马度阴山。" },
  { title: "从军行其四", author: "王昌龄", dynasty: "唐", content: "青海长云暗雪山，孤城遥望玉门关。黄沙百战穿金甲，不破楼兰终不还。" },
  { title: "芙蓉楼送辛渐", author: "王昌龄", dynasty: "唐", content: "寒雨连江夜入吴，平明送客楚山孤。洛阳亲友如相问，一片冰心在玉壶。" },
  { title: "画", author: "王维", dynasty: "唐", content: "远看山有色，近听水无声。春去花还在，人来鸟不惊。" },
  { title: "九月九日忆山东兄弟", author: "王维", dynasty: "唐", content: "独在异乡为异客，每逢佳节倍思亲。遥知兄弟登高处，遍插茱萸少一人。" },
  { title: "鹿柴", author: "王维", dynasty: "唐", content: "空山不见人，但闻人语响。返景入深林，复照青苔上。" },
  { title: "鸟鸣涧", author: "王维", dynasty: "唐", content: "人闲桂花落，夜静春山空。月出惊山鸟，时鸣春涧中。" },
  { title: "山居秋暝", author: "王维", dynasty: "唐", content: "空山新雨后，天气晚来秋。明月松间照，清泉石上流。竹喧归浣女，莲动下渔舟。随意春芳歇，王孙自可留。" },
  { title: "送元二使安西", author: "王维", dynasty: "唐", content: "渭城朝雨浥轻尘，客舍青青柳色新。劝君更尽一杯酒，西出阳关无故人。" },
  { title: "杂诗.君自故乡来", author: "王维", dynasty: "唐", content: "杂诗·君自故乡来君自故乡来，应知故乡事。来日绮窗前，寒梅著花未？" },
  { title: "竹里馆", author: "王维", dynasty: "唐", content: "独坐幽篁里，弹琴复长啸。深林人不知，明月来相照。" },
  { title: "嫦娥", author: "李商隐", dynasty: "唐", content: "云母屏风烛影深，长河渐落晓星沉。嫦娥应悔偷灵药，碧海青天夜夜心。" },
  { title: "乐游原/登乐游原", author: "李商隐", dynasty: "唐", content: "向晚意不适，驱车登古原。夕阳无限好，只是近黄昏。" },
  { title: "逢入京使", author: "岑参", dynasty: "唐", content: "故园东望路漫漫，双袖龙钟泪不干。马上相逢无纸笔，凭君传语报平安。" },
  { title: "碛中作", author: "岑参", dynasty: " 唐 ", content: "走马西来欲到天，辞家见月两回圆。今夜不知何处宿，平沙万里绝人烟。" },
  { title: "江南春", author: "杜牧", dynasty: "唐", content: "千里莺啼绿映红，水村山郭酒旗风。南朝四百八十寺，多少楼台烟雨中。" },
  { title: "清明", author: "杜牧", dynasty: "唐", content: "清明时节雨纷纷，路上行人欲断魂。借问酒家何处有，牧童遥指杏花村。" },
  { title: "秋夕", author: "杜牧", dynasty: "唐", content: "银烛秋光冷画屏，轻罗小扇扑流萤。天阶夜色凉如水，卧看牵牛织女星。" },
  { title: "山行", author: "杜牧", dynasty: "唐", content: "远上寒山石径斜，白云生处有人家。停车坐爱枫林晚，霜叶红于二月花。" },
  { title: "江上渔者", author: "范仲淹", dynasty: "宋", content: "江上往来人，但爱鲈鱼美。君看一叶舟，出没风波里。" },
  { title: "晚春二首其一", author: "韩愈", dynasty: "唐", content: "草树知春不久归，百般红紫斗芳菲。杨花榆荚无才思，惟解漫天作雪飞。" },
  { title: "晚春二首其二", author: "韩愈", dynasty: "未知", content: "谁收春色将归去，慢绿妖红半不存。榆荚只能随柳絮，等闲撩乱走空园。" },
  { title: "早春呈水部张十八员外", author: "韩愈", dynasty: "唐", content: "天街小雨润如酥，草色遥看近却无。最是一年春好处，绝胜烟柳满皇都。" },
  { title: "江南", author: "汉乐府", dynasty: "未知", content: "江南可采莲，莲叶何田田，鱼戏莲叶间。鱼戏莲叶东，鱼戏莲叶西，鱼戏莲叶南，鱼戏莲叶北。" },
  { title: "四时田园杂兴其二十五", author: "范成大", dynasty: "宋", content: "梅子金黄杏子肥，麦花雪白菜花稀。日长篱落无人过，惟有蜻蜓蛱蝶飞。" },
  { title: "村居", author: "高鼎", dynasty: "清", content: "草长莺飞二月天，拂堤杨柳醉春烟。儿童散学归来早，忙趁东风放纸鸢。" },
  { title: "山亭夏日", author: "高骈", dynasty: " 唐 ", content: "绿树阴浓夏日长，楼台倒影入池塘。水晶帘动微风起，满架蔷薇一院香。" },
  { title: "别董大", author: "高适", dynasty: "唐", content: "千里黄云白日曛，北风吹雁雪纷纷。莫愁前路无知己，天下谁人不识君。" },
  { title: "己亥杂诗", author: "龚自珍", dynasty: "清", content: "九州生气恃风雷，万马齐喑究可哀。我劝天公重抖擞，不拘一格降人材。" },
  { title: "晚春江晴寄友人", author: "韩琮", dynasty: " 唐 ", content: "晚日低霞绮，晴山远画眉。春青河畔草，不是望乡时。" },
  { title: "寒食", author: "韩翃", dynasty: "唐", content: "春城无处不飞花，寒食东风御柳斜。日暮汉宫传蜡烛，轻烟散入五侯家。" },
  { title: "小儿垂钓", author: "胡令能", dynasty: "唐", content: "蓬头稚子学垂纶，侧坐莓苔草映身。路人借问遥招手，怕得鱼惊不应人。" },
  { title: "咏华山", author: "寇准", dynasty: " 宋 ", content: "只有天在上，更无山与齐。举头红日近，回首白云低。" },
  { title: "村晚", author: "雷震", dynasty: "宋", content: "草满池塘水满陂，山衔落日浸寒漪。牧童归去横牛背，短笛无腔信口吹。" },
  { title: "风", author: "李峤", dynasty: "唐", content: "解落三秋叶，能开二月花。过江千尺浪，入竹万竿斜。" },
  { title: "夏日绝句", author: "李清照", dynasty: "宋", content: "生当作人杰，死亦为鬼雄。至今思项羽，不肯过江东。" },
  { title: "乞巧", author: "林杰", dynasty: "唐", content: "七夕今宵看碧霄，牵牛织女渡河桥。家家乞巧望秋月，穿尽红丝几万条。" },
  { title: "题临安邸", author: "林升", dynasty: "宋", content: "山外青山楼外楼，西湖歌舞几时休？暖风熏得游人醉，直把杭州作汴州。" },
  { title: "逢雪宿芙蓉山主人", author: "刘长卿", dynasty: "唐", content: "日暮苍山远，天寒白屋贫。柴门闻犬吠，风雪夜归人。" },
  { title: "江雪", author: "柳宗元", dynasty: "唐", content: "千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。" },
  { title: "雪梅", author: "卢钺", dynasty: "宋", content: "梅雪争春未肯降，骚人阁笔费评章。梅须逊雪三分白，雪却输梅一段香。有梅无雪不精神，有雪无诗俗了人。日暮诗成天又雪，与梅并作十分春。" },
  { title: "蜂", author: "罗隐", dynasty: "唐", content: "不论平地与山尖，无限风光尽被占。采得百花成蜜后，为谁辛苦为谁甜？" },
  { title: "牧童", author: "吕岩", dynasty: " 唐 ", content: "草铺横野六七里，笛弄晚风三四声。归来饱饭黄昏后，不脱蓑衣卧月明。" },
  { title: "游子吟", author: "孟郊", dynasty: "唐", content: "慈母手中线，游子身上衣。临行密密缝，意恐迟迟归。谁言寸草心，报得三春晖。" },
  { title: "画眉鸟", author: "欧阳修", dynasty: " 宋 ", content: "百啭千声随意移，山花红紫树高低。始知锁向金笼听，不及林间自在啼。" },
  { title: "马上作", author: "戚继光", dynasty: " 明 ", content: "南北驱驰报主情，江花边草笑平生。一年三百六十日，多是横戈马上行。" },
  { title: "采薇", author: "诗经", dynasty: "先秦", content: "采薇采薇，薇亦作止。曰归曰归，岁亦莫止。豆苗采了又采，薇菜刚刚冒出地面。靡室靡家，玁狁之故。不遑启居，猃狁之故。采薇采薇，薇亦柔止。曰归曰归，心亦忧止。豆苗采了又采，薇菜柔嫩的样子。说回家了回家了，心中是多么忧闷。忧心烈烈，载饥载渴。我戍未定，靡使归聘。忧心如焚，饥渴交加实在难忍。采薇采薇，薇亦刚止。曰归曰归，岁亦阳止。豆苗采了又采，薇菜的茎叶变老了。王事靡盬，不遑启处。忧心孔疚，我行不来！征役没有休止，哪能有片刻安身。心中是那么痛苦，到如今不能回家。彼尔维何？维常之华。彼路斯何？君子之车。那盛开着的是什么花？是棠棣花。戎车既驾，四牡业业。岂敢定居？一月三捷。兵车已经驾起，四匹雄马又高又大。驾彼四牡，四牡骙骙。君子所依，小人所腓。四牡翼翼，象弭鱼服。岂不日戒？猃狁孔棘！昔我往矣，杨柳依依。今我来思，雨雪霏霏。回想当初出征时，杨柳依依随风吹。如今回来路途中，大雪纷纷满天飞。行道迟迟，载渴载饥。我心伤悲，莫知我哀！道路泥泞难行走，又饥又渴真劳累。满腔伤感满腔悲，我的哀痛谁体会！" },
  { title: "江村即事", author: "司空曙", dynasty: " 唐 ", content: "钓罢归来不系船，江村月落正堪眠。纵然一夜风吹去，只在芦花浅水边。" },
  { title: "狱中题壁", author: "谭嗣同", dynasty: " 清 ", content: "望门投止思张俭，忍死须臾待杜根。我自横刀向天笑，去留肝胆两昆仑。" },
  { title: "画鸡", author: "唐寅", dynasty: "明", content: "头上红冠不用裁，满身雪白走将来。平生不敢轻言语，一叫千门万户开。" },
  { title: "送杜少府之任蜀州", author: "王勃", dynasty: "唐", content: "城阙辅三秦，风烟望五津。与君离别意，同是宦游人。海内存知己，天涯若比邻。无为在歧路，儿女共沾巾。" },
  { title: "凉州词", author: "王翰", dynasty: "唐", content: "葡萄美酒夜光杯，欲饮琵琶马上催。醉卧沙场君莫笑，古来征战几人回。" },
  { title: "送春", author: "王令", dynasty: " 宋 ", content: "春晚三月残花落更开，小檐日日燕飞来。子规夜半犹啼血，不信东风唤不回。" },
  { title: "墨梅", author: "王冕", dynasty: "元", content: "我家洗砚池头树，朵朵花开淡墨痕。不要人夸好颜色，只留清气满乾坤。" },
  { title: "朝天子.咏喇叭", author: "王磐", dynasty: "明", content: "喇叭，唢呐，曲儿小腔儿大。官船来往乱如麻，全仗你抬声价。军听了军愁，民听了民怕。哪里去辨甚么真共假？眼见的吹翻了这家，吹伤了那家，只吹的水尽鹅飞罢！直吹得水流干鹅飞跑，家破人亡啊！" },
  { title: "滁州西涧", author: "韦应物", dynasty: "唐", content: "独怜幽草涧边生，上有黄鹂深树鸣。春潮带雨晚来急，野渡无人舟自横。" },
  { title: "乡村四月", author: "翁卷", dynasty: "宋", content: "绿遍山原白满川，子规声里雨如烟。乡村四月闲人少，才了蚕桑又插田。" },
  { title: "山中杂诗", author: "吴均", dynasty: "未知", content: "山际见来烟，竹中窥落日。鸟向檐上飞，云从窗里出。" },
  { title: "石灰吟", author: "于谦", dynasty: "明", content: "千锤万凿出深山，烈火焚烧若等闲。粉骨碎身浑不怕，要留清白在人间。" },
  { title: "江南", author: "汉乐府", dynasty: "未知", content: "江南可采莲，莲叶何田田，鱼戏莲叶间。鱼戏莲叶东，鱼戏莲叶西，鱼戏莲叶南，鱼戏莲叶北。" },
  { title: "长歌行", author: "汉乐府", dynasty: "未知", content: "青青园中葵，朝露待日晞。阳春布德泽，万物生光辉。常恐秋节至，焜黄华叶衰。百川东到海，何时复西归?少壮不努力，老大徒伤悲。" },
  { title: "回乡偶书", author: "贺知章", dynasty: "唐", content: "少小离家老大回，乡音无改鬓毛衰。儿童相见不相识，笑问客从何处来。" },
  { title: "咏柳", author: "贺知章", dynasty: "唐", content: "碧玉妆成一树高，万条垂下绿丝绦。不知细叶谁裁出，二月春风似剪刀。" },
  { title: "题诗后", author: "贾岛", dynasty: " 唐 ", content: "两句三年得，一吟双泪流。知音如不赏，归卧故山秋。" },
  { title: "寻隐者不遇", author: "贾岛", dynasty: "唐", content: "松下问童子，言师采药去。只在此山中，云深不知处。" },
  { title: "马诗其五", author: "李贺", dynasty: "未知", content: "大漠沙如雪，燕山月似钩。何当金络脑，快走踏清秋。" },
  { title: "南园十三首其五", author: "李贺", dynasty: " 唐 ", content: "男儿何不带吴钩，收取关山五十州。请君暂上凌烟阁，若个书生万户侯？" },
  { title: "悯农其一", author: "李绅", dynasty: "唐", content: "春种一粒粟，秋收万颗子。四海无闲田，农夫犹饿死。" },
  { title: "悯农其二", author: "李绅", dynasty: "唐", content: "锄禾日当午，汗滴禾下土。谁知盘中餐，粒粒皆辛苦？" },
  { title: "和张仆射塞下曲其二", author: "卢纶", dynasty: "唐", content: "林暗草惊风，将军夜引弓。平明寻白羽，没在石棱中。" },
  { title: "和张仆射塞下曲其三", author: "卢纶", dynasty: "唐", content: "月黑雁飞高，单于夜遁逃。欲将轻骑逐，大雪满弓刀。" },
  { title: "春游湖", author: "徐俯", dynasty: " 宋 ", content: "双飞燕子几时回？夹岸桃花蘸水开。春雨断桥人不渡，小舟撑出柳阴来。" },
  { title: "劝学", author: "颜真卿", dynasty: "唐", content: "三更灯火五更鸡，正是男儿读书时。黑发不知勤学早，白首方悔读书迟。" },
  { title: "惠崇春江晚景", author: "苏轼", dynasty: "宋", content: "竹外桃花三两枝，春江水暖鸭先知。蒌蒿满地芦芽短，正是河豚欲上时。" },
  { title: "长相思", author: "纳兰性德", dynasty: "清", content: "山一程，水一程，身向榆关那畔行，夜深千帐灯。风一更，雪一更，聒碎乡心梦不成，故园无此声。" },
  { title: "送元二使安西", author: "王维", dynasty: "唐", content: "渭城朝雨浥轻尘，客舍青青柳色新。劝君更尽一杯酒，西出阳关无故人。" },
  { title: "过故人庄", author: "孟浩然", dynasty: "唐", content: "故人具鸡黍，邀我至田家。绿树村边合，青山郭外斜。开轩面场圃，把酒话桑麻。待到重阳日，还来就菊花。" },
  { title: "卜算子.送鲍浩然之浙东", author: "王观", dynasty: "宋", content: "水是眼波横，山是眉峰聚。欲问行人去那边？眉眼盈盈处。才始送春归，又送君归去。若到江南赶上春，千万和春住。" },
  { title: "满江红", author: "岳飞", dynasty: " 宋 ", content: "怒发冲冠，凭栏处、潇潇雨歇。抬望眼，仰天长啸，壮怀激烈。三十功名尘与土，八千里路云和月。莫等闲，白了少年头，空悲切！靖康耻，犹未雪。臣子恨，何时灭！驾长车，踏破贺兰山缺。壮志饥餐胡虏肉，笑谈渴饮匈奴血。待从头、收拾旧山河，朝天阙。" },
  { title: "秋思", author: "张籍", dynasty: "唐", content: "洛阳城里见秋风，欲作家书意万重。复恐匆匆说不尽，行人临发又开封。" },
  { title: "枫桥夜泊", author: "张继", dynasty: "唐", content: "月落乌啼霜满天，江枫渔火对愁眠。姑苏城外寒山寺，夜半钟声到客船。" },
  { title: "早梅", author: "张渭", dynasty: " 唐 ", content: "一树寒梅白玉条，迥临村路傍溪桥。不知近水花先发，疑是经冬雪未销。" },
  { title: "渔歌子", author: "张志和", dynasty: "唐", content: "西塞山前白鹭飞，桃花流水鳜鱼肥。青箬笠，绿蓑衣，斜风细雨不须归。" },
  { title: "竹石", author: "郑燮", dynasty: "清", content: "咬定青山不放松，立根原在破岩中。千磨万击还坚劲，任尔东西南北风。" },
  { title: "终南望余雪", author: "祖咏", dynasty: "唐", content: "终南阴岭秀，积雪浮云端。林表明霁色，城中增暮寒。" },
  { title: "长恨歌", author: "白居易", dynasty: "唐", content: "汉皇重色思倾国，御宇多年求不得。杨家有女初长成，养在深闺人未识。天生丽质难自弃，一朝选在君王侧。回眸一笑百媚生，六宫粉黛无颜色。春寒赐浴华清池，温泉水滑洗凝脂。侍儿扶起娇无力，始是新承恩泽时。云鬓花颜金步摇，芙蓉帐暖度春宵。春宵苦短日高起，从此君王不早朝。承欢侍宴无闲暇，春从春游夜专夜。后宫佳丽三千人，三千宠爱在一身。金屋妆成娇侍夜，玉楼宴罢醉和春。姊妹弟兄皆列土，可怜光彩生门户。遂令天下父母心，不重生男重生女。骊宫高处入青云，仙乐风飘处处闻。缓歌慢舞凝丝竹，尽日君王看不足。渔阳鼙鼓动地来，惊破霓裳羽衣曲。九重城阙烟尘生，千乘万骑西南行。翠华摇摇行复止，西出都门百余里。六军不发无奈何，宛转娥眉马前死。花钿委地无人收，翠翘金雀玉搔头。君王掩面救不得，回看血泪相和流。黄埃散漫风萧索，云栈萦纡登剑阁。峨嵋山下少人行，旌旗无光日色薄。蜀江水碧蜀山青，圣主朝朝暮暮情。行宫见月伤心色，夜雨闻铃肠断声。天旋日转回龙驭，到此踌躇不能去。马嵬坡下泥土中，不见玉颜空死处。君臣相顾尽沾衣，东望都门信马归。归来池苑皆依旧，太液芙蓉未央柳。芙蓉如面柳如眉，对此如何不泪垂。春风桃李花开夜，秋雨梧桐叶落时。西宫南苑多秋草，落叶满阶红不扫。梨园弟子白发新，椒房阿监青娥老。夕殿萤飞思悄然，孤灯挑尽未成眠。迟迟钟鼓初长夜，耿耿星河欲曙天。鸳鸯瓦冷霜华重，翡翠衾寒谁与共。悠悠生死别经年，魂魄不曾来入梦。临邛道士鸿都客，能以精诚致魂魄。为感君王辗转思，遂教方士殷勤觅。排空驭气奔如电，升天入地求之遍。上穷碧落下黄泉，两处茫茫皆不见。忽闻海上有仙山，山在虚无缥缈间。楼阁玲珑五云起，其中绰约多仙子。中有一人字太真，雪肤花貌参差是。金阙西厢叩玉扃，转教小玉报双成。闻道汉家天子使，九华帐里梦魂惊。揽衣推枕起徘徊，珠箔银屏迤逦开。云鬓半偏新睡觉，花冠不整下堂来。风吹仙袂飘飖举，犹似霓裳羽衣舞。玉容寂寞泪阑干，梨花一枝春带雨。含情凝睇谢君王，一别音容两渺茫。昭阳殿里恩爱绝，蓬莱宫中日月长。回头下望人寰处，不见长安见尘雾。惟将旧物表深情，钿合金钗寄将去。钗留一股合一扇，钗擘黄金合分钿。但令心似金钿坚，天上人间会相见。临别殷勤重寄词，词中有誓两心知。七月七日长生殿，夜半无人私语时。在天愿作比翼鸟，在地愿为连理枝。天长地久有时尽，此恨绵绵无绝期。" },
  { title: "天净沙·秋思", author: "马致远", dynasty: "元", content: "枯藤老树昏鸦，小桥流水人家，古道西风瘦马。夕阳西下，断肠人在天涯。" },
  { title: "春望", author: "杜甫", dynasty: "唐", content: "国破山河在，城春草木深。感时花溅泪，恨别鸟惊心。烽火连三月，家书抵万金。白头搔更短，浑欲不胜簪。" },
  { title: "夜雨寄北", author: "李商隐", dynasty: "唐", content: "君问归期未有期，巴山夜雨涨秋池。何当共剪西窗烛，却话巴山夜雨时。" },
  { title: "归园田居其三", author: "陶渊明", dynasty: "魏晋", content: "种豆南山下，草盛豆苗稀。晨兴理荒秽，带月荷锄归。道狭草木长，夕露沾我衣。衣沾不足惜，但使愿无违。" },
  { title: "赠刘景文", author: "苏轼", dynasty: "宋", content: "荷尽已无擎雨盖，菊残犹有傲霜枝。一年好景君须记，最是橙黄橘绿时。" },
  { title: "卜算子.咏梅", author: "毛泽东", dynasty: "现", content: "风雨送春归，飞雪迎春到。已是悬崖百丈冰，犹有花枝俏。俏也不争春，只把春来报。待到山花烂漫时，她在丛中笑。" },
  { title: "观书有感其二", author: "朱熹", dynasty: "宋", content: "昨夜江边春水生，蒙冲巨舰一毛轻。向来枉费推移力，此日中流自在行。" },
];

const STYLES = [
  {
    id: "ink",
    name: "水墨丹青",
    desc: "Traditional Ink Wash",
    prompt: "采用中国传统写意手法。强调‘墨分五色’（焦、浓、重、淡、清）的变化。宣纸质感、留白意境、皴法、气韵生动、水墨晕染、禅意。画面构图疏朗，严禁使用鲜艳的合成色彩，以黑白灰为主，点缀少量赭石或花青。"
  },
  {
    id: "anime",
    name: "唯美动漫",
    desc: "Aesthetic Anime",
    prompt: "模仿新海诚（Makoto Shinkai）风格。强调光影的通透感和空间的深远感。丁达尔效应（Tyndall effect）、高动态范围色彩、梦幻云朵、极细线条、电影感构图、治愈系。色彩明亮、饱和度较高，特别强调天空中光影的折射，画面要给人以清新、温暖的感觉。"
  },
  {
    id: "oil",
    name: "重彩油画",
    desc: "Impressionist Oil Painting",
    prompt: "采用古典印象派笔触。强调颜料的堆叠感和丰富的光影对比。笔触感（Visible brushstrokes）、厚涂（Impasto）、卡拉瓦乔式光影、丰富的肌理、古典审美。画面要有沉甸甸的质感，通过冷暖色调的强烈对比来表现诗句的情感，画面要有油画帆布的颗粒感。"
  }
];

interface HistoryItem {
  imageUrl: string;
  analysis: PoemAnalysis;
  styleId: string;
}

const EMPTY_SETTINGS: AppSettings = {
  geminiApiKey: '',
  dashscopeApiKey: '',
  lastModelType: '',
  lastUsedStyle: '',
};

export interface RegionInfo {
  anchorX_px: number;
  anchorY_px: number;
  isDark: boolean;
}

export const analyzeImageForLayout = (imageUrl: string, width: number = 1920, height: number = 1080): Promise<RegionInfo> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const regions = [
        { name: 'TR', x: canvas.width * 0.6, y: canvas.height * 0.05, w: canvas.width * 0.35, h: canvas.height * 0.6, anchorX: width * 0.88, anchorY: height * 0.15 },
        { name: 'TL', x: canvas.width * 0.05, y: canvas.height * 0.05, w: canvas.width * 0.35, h: canvas.height * 0.6, anchorX: width * 0.35, anchorY: height * 0.15 },
        { name: 'BR', x: canvas.width * 0.6, y: canvas.height * 0.4, w: canvas.width * 0.35, h: canvas.height * 0.55, anchorX: width * 0.88, anchorY: height * 0.4 },
        { name: 'BL', x: canvas.width * 0.05, y: canvas.height * 0.4, w: canvas.width * 0.35, h: canvas.height * 0.55, anchorX: width * 0.35, anchorY: height * 0.4 }
      ];

      let bestRegion = regions[0];
      let minVariance = Infinity;
      let bestRegionAvgLuma = 0;

      for (const r of regions) {
        let sumLuma = 0;
        let sumLumaSq = 0;
        let count = 0;

        for (let y = Math.floor(r.y); y < Math.floor(r.y + r.h); y += 4) {
          for (let x = Math.floor(r.x); x < Math.floor(r.x + r.w); x += 4) {
            const i = (y * canvas.width + x) * 4;
            const rVal = data[i];
            const gVal = data[i + 1];
            const bVal = data[i + 2];
            const luma = 0.2126 * rVal + 0.7152 * gVal + 0.0722 * bVal;
            sumLuma += luma;
            sumLumaSq += luma * luma;
            count++;
          }
        }

        const avgLuma = sumLuma / count;
        const variance = (sumLumaSq / count) - (avgLuma * avgLuma);

        // Penalty for regions that are non-uniform (high variance)
        if (variance < minVariance) {
          minVariance = variance;
          bestRegion = r;
          bestRegionAvgLuma = avgLuma;
        }
      }

      resolve({
        anchorX_px: bestRegion.anchorX,
        anchorY_px: bestRegion.anchorY,
        isDark: bestRegionAvgLuma < 128
      });
    };
    img.onerror = () => {
      resolve({ anchorX_px: width * 0.88, anchorY_px: height * 0.15, isDark: false }); // Fallback Top-Right
    };
    img.src = imageUrl;
  });
};

export default function App() {
  const desktopMode = isDesktopRuntime();
  const [hasKey, setHasKey] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(EMPTY_SETTINGS);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPoemIndex, setSelectedPoemIndex] = useState(0);
  const [selectedStyleId, setSelectedStyleId] = useState(STYLES[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<PoemAnalysis | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const studyCardRef = useRef<HTMLDivElement>(null);

  const [selectedModel, setSelectedModel] = useState<'free' | 'paid' | 'wanxiang'>('wanxiang');
  const [selectedFont, setSelectedFont] = useState<'font-calligraphy' | 'font-brush' | 'font-cursive'>('font-brush');
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<Record<string, HistoryItem>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingChars, setAnimatingChars] = useState<any[]>([]);
  const [showOverlayText, setShowOverlayText] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<{ anchorX: number, anchorY: number, textColor: string, shadowColor: string } | null>(null);

  const [isPlayingBgm, setIsPlayingBgm] = useState(false);
  const [hasAutoPlayedBgm, setHasAutoPlayedBgm] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isSpeaking ? 0.2 : 1.0;
    }
  }, [isSpeaking]);

  const toggleBgm = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setHasAutoPlayedBgm(true);
    if (audioRef.current) {
      if (isPlayingBgm) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.error("Audio playback prevented", err));
      }
      setIsPlayingBgm(!isPlayingBgm);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        if (desktopMode) {
          const loaded = await loadSettings();
          if (cancelled) return;

          setAppSettings(loaded);
          const initialModel = normalizeModelType(loaded.lastModelType);
          setSelectedModel(initialModel);
          if (loaded.lastUsedStyle && STYLES.some(style => style.id === loaded.lastUsedStyle)) {
            setSelectedStyleId(loaded.lastUsedStyle);
          }

          setHasKey(isAppConfiguredForUse(true, loaded, false, initialModel));
          setShowSettings(shouldOpenSettingsGate(loaded, initialModel));
        } else if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
          const selected = await (window as any).aistudio.hasSelectedApiKey();
          if (!cancelled) {
            setHasKey(selected);
          }
        } else {
          setHasKey(true);
        }
      } catch (bootstrapError: any) {
        console.error('初始化设置失败:', bootstrapError);
        if (!cancelled) {
          if (desktopMode) {
            setAppSettings(EMPTY_SETTINGS);
            setHasKey(false);
            setShowSettings(true);
            setError('读取本地设置失败，请重新填写 API Key。');
          } else {
            setHasKey(true);
          }
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [desktopMode]);

  const handleSelectKey = async () => {
    if (desktopMode) {
      setShowSettings(true);
      return;
    }

    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleSettingsChange = (patch: Partial<AppSettings>) => {
    setAppSettings(previous => ({ ...previous, ...patch }));
  };

  const handleSaveSettings = async () => {
    const nextSettings: AppSettings = {
      ...appSettings,
      lastModelType: selectedModel,
      lastUsedStyle: selectedStyleId,
    };

    if (!isSettingsSatisfiedForModel(nextSettings, selectedModel)) {
      setError(selectedModel === 'wanxiang' ? '请先填写 DashScope API Key。' : '请先填写 Gemini API Key。');
      return;
    }

    setIsSettingsSaving(true);
    setError(null);
    try {
      if (desktopMode) {
        await saveSettings(nextSettings);
      }
      setAppSettings(nextSettings);
      setHasKey(isAppConfiguredForUse(desktopMode, nextSettings, true, selectedModel));
      setShowSettings(false);
    } catch (saveError: any) {
      console.error('保存设置失败:', saveError);
      setError(saveError.message || '保存设置失败，请重试');
    } finally {
      setIsSettingsSaving(false);
    }
  };

  const [expandedPoemIndex, setExpandedPoemIndex] = useState<number | null>(0);
  const poemListRef = useRef<HTMLDivElement>(null);

  const handlePoemClick = (index: number) => {
    // Attempt ambient autoplay on first interaction if not playing
    if (audioRef.current && !hasAutoPlayedBgm) {
      setHasAutoPlayedBgm(true);
      if (!isPlayingBgm) {
        audioRef.current.play().then(() => setIsPlayingBgm(true)).catch(() => { });
      }
    }

    if (selectedPoemIndex === index && expandedPoemIndex === index) {
      setExpandedPoemIndex(null);
    } else {
      setSelectedPoemIndex(index);
      setExpandedPoemIndex(index);

      // Wait slightly longer than the 300ms CSS height animation to avoid DOM shifting during collapse
      setTimeout(() => {
        const item = document.getElementById(`poem-item-${index}`);
        if (item && poemListRef.current) {
          const container = poemListRef.current;
          const containerRect = container.getBoundingClientRect();
          const itemRect = item.getBoundingClientRect();
          // Calculate precise scroll target with an 8px top padding offset for breathing room
          const targetTop = container.scrollTop + (itemRect.top - containerRect.top) - 8;

          container.scrollTo({
            top: targetTop,
            behavior: 'smooth'
          });
        }
      }, 350);
    }
  };

  const handleSpeakPoem = (poem: typeof POEMS[0], index: number) => {
    if ('speechSynthesis' in window) {
      // Toggle play/stop for the same poem
      if (isSpeaking && speakingIndex === index) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setSpeakingIndex(null);
        return;
      }

      // Stop anything currently playing
      window.speechSynthesis.cancel();

      setIsSpeaking(true);
      setSpeakingIndex(index);

      // Format text with pauses implicitly via punctuation
      const textToSpeak = `${poem.title}。${poem.dynasty}代，${poem.author}。${poem.content}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      // 优先寻找微软更高质量的中文女声（如晓晓、晓伊）或男声（如云希）
      // 如果是在 MacOS 的 Safari 或 Edge 下，寻找 Ting-Ting 或相应的增强发音
      const voices = window.speechSynthesis.getVoices();
      console.log('Available voices:', voices.map(v => v.name));

      let bestVoice = voices.find(v => v.name.includes('Xiaoxiao')); // Microsoft Xiaoxiao Online (Natural)
      if (!bestVoice) bestVoice = voices.find(v => v.name.includes('Yunxi')); // Microsoft Yunxi Online (Natural)
      if (!bestVoice) bestVoice = voices.find(v => v.name.includes('Ting-Ting')); // Mac Safari
      if (!bestVoice) bestVoice = voices.find(v => v.name.includes('Tingting')); // Mac Chrome
      if (!bestVoice) bestVoice = voices.find(v => v.name.includes('Yaoyao') || v.name.includes('Kangkang')); // Mac legacy
      if (!bestVoice) bestVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('cmn')); // 兜底任何中文

      if (bestVoice) {
        utterance.voice = bestVoice;
        console.log('Selected Voice:', bestVoice.name);
      }
      utterance.lang = 'zh-CN';
      utterance.rate = 0.8; // 更慢一点，增强古风诗意
      utterance.pitch = 1.0;

      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingIndex(null);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeakingIndex(null);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setError("您的浏览器当前不支持语音朗读功能。");
    }
  };

  const filteredPoems = useMemo(() => {
    if (!searchQuery.trim()) return POEMS;
    const query = searchQuery.toLowerCase();
    return POEMS.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.author.toLowerCase().includes(query) ||
      p.content.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const currentPoem = filteredPoems[selectedPoemIndex] || filteredPoems[0] || POEMS[0];

  // Load history when poem changes
  useEffect(() => {
    const poemHistory = history[currentPoem.title];
    if (poemHistory) {
      setImageUrl(poemHistory.imageUrl);
      setAnalysis(poemHistory.analysis);
      setSelectedStyleId(poemHistory.styleId);
      // We do NOT show text by default when loading from history
      // User must click the button to see it again
      setShowOverlayText(false);
    } else {
      setImageUrl(null);
      setAnalysis(null);
      setShowOverlayText(false);
    }
  }, [selectedPoemIndex, history, currentPoem.title]);

  const handleGenerate = async (poemOverride?: typeof POEMS[0]) => {
    if (desktopMode && !isSettingsSatisfiedForModel(appSettings, selectedModel)) {
      setError(selectedModel === 'wanxiang'
        ? '当前选择了万象画卷，请先在工坊设置中填写 DashScope API Key。'
        : '当前选择了 Gemini 画卷，请先在工坊设置中填写 Gemini API Key。');
      setShowSettings(true);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setAnalysis(null);
    setImageUrl(null);
    setShowOverlayText(false);

    const targetPoem = poemOverride || currentPoem;
    const style = STYLES.find(s => s.id === selectedStyleId)!;

    try {
      const analysisResult = await analyzePoem(targetPoem.title, targetPoem.author, targetPoem.content, style.name, style.prompt, selectedModel);
      const base64Image = await generateImage(analysisResult.imagePrompt, selectedModel);

      // Set both together so they appear at the same time
      setAnalysis(analysisResult);
      setImageUrl(base64Image);
      setShowOverlayText(false); // Explcitly ensure text is off on new generation

      // Save to history
      setHistory(prev => ({
        ...prev,
        [targetPoem.title]: {
          imageUrl: base64Image,
          analysis: analysisResult,
          styleId: selectedStyleId
        }
      }));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "生成失败，请稍后重试。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLeadPoemIntoPainting = async (poemOverride?: typeof POEMS[0]) => {
    if (!imageUrl || isAnimating) return;
    setIsAnimating(true);
    setShowOverlayText(false);

    // Calculate background brightness and dynamic anchor point
    let anchorX_px = 1920 * 0.88;
    let anchorY_px = 1080 * 0.15;
    let isDarkBackground = false;
    try {
      const layoutAnalysis = await analyzeImageForLayout(imageUrl);
      anchorX_px = layoutAnalysis.anchorX_px;
      anchorY_px = layoutAnalysis.anchorY_px;
      isDarkBackground = layoutAnalysis.isDark;
    } catch (e) {
      console.warn("Could not calculate smart layout, using default", e);
    }

    const poem = poemOverride || currentPoem;
    const lines = poem.content.split(/[，。！？、,.!?\s]+/).filter(l => l.trim().length > 0);

    // Safety clamp to prevent cutting off text on the left edge if placed in TL/BL regions
    const requiredWidth = (lines.length + 3) * 80;
    if (anchorX_px - requiredWidth < 120) {
      anchorX_px = requiredWidth + 120;
    }

    const textColor = isDarkBackground ? 'rgba(255, 255, 255, 0.95)' : 'rgba(20, 20, 20, 0.9)';
    const baseShadowColor = isDarkBackground ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)';
    const cssTextShadow = `0px 0px 15px ${baseShadowColor}, 1px 1px 2px ${baseShadowColor}`;
    const sealTextShadow = 'none';

    setCurrentLayout({ anchorX: anchorX_px, anchorY: anchorY_px, textColor: textColor, shadowColor: baseShadowColor });

    const chars: any[] = [];
    let delay = 0;
    const charDelay = 150; // ms per character

    let currentX_px = anchorX_px;

    // 1. Content (Body)
    for (let line of lines) {
      let currentY_px = anchorY_px;
      for (let i = 0; i < line.length; i++) {
        chars.push({
          char: line[i],
          type: 'body',
          targetX: currentX_px / 1920 * 100,
          targetY: currentY_px / 1080 * 100,
          delay: delay,
          textColor: textColor,
          shadowColor: baseShadowColor, // Base color for canvas/other uses
          cssTextShadow: cssTextShadow, // CSS string for text-shadow property
          writingMode: 'vertical-rl'
        });
        currentY_px += 60; // 60px line height for body
        delay += charDelay;
      }
      currentX_px -= 55; // 缩小列间距以排布更多诗句（原80）
    }

    // 2. Title
    currentX_px -= 15; // Extra padding between body and title
    let titleY_px = anchorY_px + 80; // Title starts slightly lower
    for (let i = 0; i < poem.title.length; i++) {
      chars.push({
        char: poem.title[i],
        type: 'title',
        targetX: currentX_px / 1920 * 100,
        targetY: titleY_px / 1080 * 100,
        delay: delay,
        textColor: textColor,
        shadowColor: cssTextShadow
      });
      titleY_px += 45; // Use same line height as author
      delay += charDelay;
    }

    // 3. Author & Dynasty
    currentX_px -= 55; // Padding to author
    const authorText = `${poem.dynasty} ${poem.author}`;
    let authorY_px = anchorY_px + 160; // Author starts even lower
    for (let i = 0; i < authorText.length; i++) {
      chars.push({
        char: authorText[i],
        type: 'author',
        targetX: currentX_px / 1920 * 100,
        targetY: authorY_px / 1080 * 100,
        delay: delay,
        textColor: textColor,
        shadowColor: cssTextShadow
      });
      authorY_px += 45; // Tighter line height for smaller font
      delay += charDelay;
    }

    // 4. Draw Author Seal
    let sealCenterX_px = currentX_px;
    let sealTopY_px = authorY_px + 20; // Just below the author text

    chars.push({
      isSeal: true,
      text: poem.author,
      targetX: sealCenterX_px / 1920 * 100,
      targetY: sealTopY_px / 1080 * 100,
      delay: delay,
      textColor: textColor,
      shadowColor: sealTextShadow
    });

    setAnimatingChars(chars);

    const totalDuration = delay + 1000;

    setTimeout(() => {
      setIsAnimating(false);
      setShowOverlayText(true);
      setAnimatingChars([]);
    }, totalDuration);
  };

  const handleExportCard = async () => {
    if (!studyCardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      // 1. 确保所有图片不仅加载完成，而且已解码为位图
      const imgEls = Array.from(studyCardRef.current.querySelectorAll('img'));
      await Promise.all(
        imgEls.map(async (img) => {
          if (!img.complete) {
            await new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            });
          }
          // 重要：调用 decode() 确保浏览器已完成图像解码
          try {
            await img.decode();
          } catch (e) {
            console.warn("图像解码失败，尝试继续导出", e);
          }
        })
      );

      // 2. 额外等待 DOM 合成流完成
      await new Promise(resolve => setTimeout(resolve, 300));

      // 3. 执行导出
      // html-to-image 有时在首次调用时会丢失部分元素，这通常是因为内部缓存未就绪
      // 这里我们先进行一次不保存的“预渲染”来热身
      await toPng(studyCardRef.current, { skipFonts: true });
      
      const imageDataUrl = await toPng(studyCardRef.current, {
        pixelRatio: 2, 
        backgroundColor: '#F8F9FA',
        skipFonts: true, 
      });

      const link = document.createElement('a');
      link.download = `学霸导学卡-${currentPoem.title}.png`;
      link.href = imageDataUrl;
      link.click();
    } catch (err) {
      console.error("导出卡片失败:", err);
      setError("导出导学卡失败，请重试");
    } finally {
      setIsExporting(false);
    }
  };

  const persistedModel = normalizeModelType(appSettings.lastModelType);
  const appConfigured = isAppConfiguredForUse(desktopMode, appSettings, hasKey, persistedModel);
  const desktopNeedsSetup = desktopMode && shouldOpenSettingsGate(appSettings, persistedModel);

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
        <div className="fixed top-[8%] left-[10%] w-32 h-32 bg-red-600/40 rounded-full blur-3xl -z-10 pointer-events-none sun-element"></div>
        <div className="gufeng-card p-12 max-w-lg text-center relative overflow-hidden group">
          <Loader2 className="mx-auto mb-6 text-red-800 animate-spin" size={40} />
          <h2 className="text-3xl font-bold mb-4 font-serif tracking-widest">正在铺展画卷</h2>
          <p className="text-gray-500 leading-relaxed font-sans text-sm">正在读取本地设置与桌面环境，请稍候片刻。</p>
        </div>
      </div>
    );
  }

  if (desktopNeedsSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
        <div className="fixed top-[8%] left-[10%] w-32 h-32 bg-red-600/40 rounded-full blur-3xl -z-10 pointer-events-none sun-element"></div>

        <div className="gufeng-card p-12 max-w-xl text-center relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-800/5 rounded-full blur-3xl group-hover:bg-red-800/10 transition-colors duration-1000"></div>
          <div className="w-24 h-24 bg-red-800/10 text-red-800 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 group-hover:rotate-0 transition-transform duration-500">
            <Key size={48} />
          </div>
          <h2 className="text-3xl font-bold mb-6 font-serif tracking-widest">首次启卷</h2>
          <p className="text-gray-500 mb-10 leading-relaxed font-sans text-sm">
            绿色版首次运行需要先填写当前模型所需密钥。默认推荐先配置 <code className="bg-black/5 px-2 py-1 rounded text-red-800 font-mono">DashScope API Key</code>，后续可在工坊设置中补充 Gemini Key。
          </p>
          <button
            onClick={() => setShowSettings(true)}
            className="w-full bg-red-800 text-white px-8 py-5 rounded-2xl font-bold hover:bg-red-900 transition-all shadow-xl hover:shadow-red-900/30 text-lg tracking-widest"
          >
            现在配置
          </button>
        </div>

        <SettingsModal
          open={showSettings}
          canClose={false}
          settings={appSettings}
          selectedModel={selectedModel}
          selectedFont={selectedFont}
          selectedStyleId={selectedStyleId}
          styles={STYLES}
          isSaving={isSettingsSaving}
          onSettingsChange={handleSettingsChange}
          onSelectModel={setSelectedModel}
          onSelectFont={setSelectedFont}
          onSelectStyle={setSelectedStyleId}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
        />
      </div>
    );
  }

  if (!appConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
        <div className="fixed top-[8%] left-[10%] w-32 h-32 bg-red-600/40 rounded-full blur-3xl -z-10 pointer-events-none sun-element"></div>

        <div className="gufeng-card p-12 max-w-lg text-center relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-800/5 rounded-full blur-3xl group-hover:bg-red-800/10 transition-colors duration-1000"></div>
          <div className="w-24 h-24 bg-red-800/10 text-red-800 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 group-hover:rotate-0 transition-transform duration-500">
            <Key size={48} />
          </div>
          <h2 className="text-3xl font-bold mb-6 font-serif tracking-widest">开启画卷</h2>
          <p className="text-gray-500 mb-10 leading-relaxed font-sans text-sm">
            当前所选模型缺少对应密钥。国内环境建议优先使用 <code className="bg-black/5 px-2 py-1 rounded text-red-800 font-mono">万象画卷</code> 并填写 DashScope API Key。
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full bg-red-800 text-white px-8 py-5 rounded-2xl font-bold hover:bg-red-900 transition-all shadow-xl hover:shadow-red-900/30 text-lg tracking-widest"
          >
            配置密钥
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen p-6 gap-6 overflow-hidden relative">
      {/* Background Sun */}
      <div className="fixed top-[8%] left-[10%] w-32 h-32 bg-red-600/40 rounded-full blur-3xl -z-10 pointer-events-none sun-element"></div>

      <SettingsModal
        open={showSettings}
        canClose={true}
        settings={appSettings}
        selectedModel={selectedModel}
        selectedFont={selectedFont}
        selectedStyleId={selectedStyleId}
        styles={STYLES}
        isSaving={isSettingsSaving}
        onSettingsChange={handleSettingsChange}
        onSelectModel={setSelectedModel}
        onSelectFont={setSelectedFont}
        onSelectStyle={setSelectedStyleId}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
      />

      {/* Left Sidebar: Controls */}
      <div className="w-[480px] flex flex-col gap-6 h-full">
        {/* Top: Product Name and Logo */}
        <div
          className="gufeng-card p-6 flex flex-col items-center justify-center relative overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/60 min-h-[160px]"
          style={{
            backgroundImage: `url(/header-bg.png)`,
            backgroundSize: 'cover',
            backgroundPosition: 'right center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Subtle gradient overlay to ensure text legibility while revealing the art on the right */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/60 to-transparent"></div>

          <div className="relative z-10 flex flex-col items-start justify-between w-full px-2 h-full py-2">
            <h1 className="text-4xl font-bold tracking-[0.25em] flex items-center gap-2 drop-shadow-sm mt-2">
              <span className="text-stone-800 font-brush transform -translate-y-1">墨韵</span>
              <span className="text-red-800 font-serif">灵笔</span>
            </h1>
            <button
              onClick={toggleBgm}
              className="absolute top-2 right-2 p-3 rounded-full bg-white/40 hover:bg-white/70 backdrop-blur-sm border border-stone-200 shadow-sm transition-all text-stone-700 z-50 hidden"
              title="古琴伴奏"
            >
              {isPlayingBgm ? <Music size={20} className="animate-pulse" /> : <VolumeX size={20} />}
            </button>
            <p className="text-xs font-serif tracking-[0.4em] text-stone-600/90 font-bold bg-white/40 px-4 py-2 rounded-sm backdrop-blur-[2px] border border-white/50 shadow-sm mt-8">
              泼墨千年<span className="mx-1 text-red-800/80">·</span><span className="text-stone-800">幻化成真</span>
            </p>
          </div>
        </div>

        {/* Middle: Poem Library */}
        <div className="gufeng-card flex-1 flex flex-col overflow-hidden p-6 gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <BookOpen size={20} className="text-red-800/60" />
              <h2 className="text-xl font-bold font-serif tracking-widest">诗词名篇</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleBgm}
                className="p-2.5 hover:bg-black/5 rounded-full transition-all text-gray-500"
                title="古琴伴奏 - 播放/静音"
              >
                {isPlayingBgm ? <Music size={20} className="animate-pulse text-red-800" /> : <VolumeX size={20} />}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2.5 hover:bg-black/5 rounded-full transition-all hover:rotate-90 duration-500"
                title="设置"
              >
                <Settings size={20} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="relative group">
            <input
              type="text"
              placeholder="搜索诗词、作者、朝代..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedPoemIndex(0);
              }}
              className="gufeng-input px-6"
            />
          </div>

          <div ref={poemListRef} className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {filteredPoems.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm font-sans">未找到匹配的诗词</div>
            ) : (
              filteredPoems.map((poem, index) => (
                <div key={index} id={`poem-item-${index}`} className="space-y-2">
                  <div
                    className={`w-full text-left px-4 py-3 rounded-2xl transition-all duration-300 flex items-center justify-between cursor-pointer ${selectedPoemIndex === index
                      ? 'bg-red-50/80 text-red-900 font-bold shadow-sm'
                      : 'hover:bg-black/5 text-gray-700'
                      }`}
                    onClick={() => handlePoemClick(index)}
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      {history[poem.title] && (
                        <div className="w-2 h-2 rounded-full bg-red-800/40 border border-red-800/20 animate-pulse shrink-0" title="已生成"></div>
                      )}
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-lg truncate">{poem.title}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-sans opacity-60 shrink-0">
                        <span>{poem.dynasty}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                        <span>{poem.author}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div title="原声朗读">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpeakPoem(poem, index);
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${isSpeaking && speakingIndex === index
                            ? 'bg-amber-100 text-amber-800 shadow-sm animate-pulse'
                            : 'bg-white/80 text-amber-700 hover:bg-white shadow-sm'
                            }`}
                        >
                          {isSpeaking && speakingIndex === index ? <VolumeX size={12} /> : <Volume2 size={12} />}
                          <span>听</span>
                        </button>
                      </div>
                      <div title="生成意境画卷">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPoemIndex(index);
                            handleGenerate(poem);
                          }}
                          disabled={isGenerating}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${isGenerating && selectedPoemIndex === index
                            ? 'bg-gray-200 text-gray-400'
                            : 'bg-white/80 text-red-800 hover:bg-white shadow-sm'
                            }`}
                        >
                          {isGenerating && selectedPoemIndex === index ? <Loader2 className="animate-spin" size={12} /> : <ImageIcon size={12} />}
                          <span>画</span>
                        </button>
                      </div>
                      <div title={!history[poem.title] ? "请先点击'画'按钮生成意境" : "引诗入画"}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPoemIndex(index);
                            handleLeadPoemIntoPainting(poem);
                          }}
                          disabled={!history[poem.title] || isAnimating}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${!history[poem.title] || isAnimating
                            ? 'bg-gray-100 text-gray-300'
                            : 'bg-red-800 text-white hover:bg-red-900 shadow-sm'
                            }`}
                        >
                          <Sparkles size={12} />
                          <span>诗</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Poem Content (Vertical RTL with Lines) */}
                  <AnimatePresence>
                    {expandedPoemIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 bg-black/5 rounded-3xl shadow-inner flex justify-center">
                          <div className={`w-full flex justify-center overflow-x-auto ${poem.content.split(/[，。！？、\n]/).filter(l => l.trim().length > 0).length <= 4 ? 'scrollbar-hide' : 'custom-scrollbar'}`}>
                            <div className={`flex flex-row-reverse p-6 bg-white/30 backdrop-blur-md rounded-2xl ${selectedFont} w-max h-fit self-center shadow-sm`}>
                              {/* Title Column */}
                              <div className="flex flex-col flex-start shrink-0 ml-5 w-12 items-center">
                                <div className="text-3xl font-bold vertical-text tracking-widest leading-none">{poem.title}</div>
                              </div>

                              {/* Author & Dynasty Column */}
                              <div className="flex flex-col justify-end shrink-0 h-full ml-1 w-6 items-center">
                                <div className="text-sm opacity-60 pb-4 vertical-text tracking-widest leading-none">
                                  {poem.dynasty} · {poem.author}
                                </div>
                              </div>

                              {/* Poem Content Column */}
                              <div className="flex flex-row-reverse gap-1.5 items-center h-full pl-3 pr-2 border-l border-stone-300/40">
                                {poem.content.split(/[，。！？、\n]/).filter(l => l.trim().length > 0).map((line, i) => (
                                  <div key={i} className="text-2xl leading-[1.8] vertical-text whitespace-nowrap w-10 shrink-0 flex justify-center">
                                    {line}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </div>


        {error && (
          <div className="p-3 bg-red-50/80 backdrop-blur-sm text-red-800 rounded-xl text-[10px] font-sans text-center shadow-sm">
            {error}
          </div>
        )}
      </div>

      {/* Right Main Content: Output */}
      <div className="flex-1 gufeng-card relative overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {!imageUrl && !isGenerating && (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center relative"
              style={{
                backgroundImage: `url(/welcome-bg-optimized.jpg)`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              {/* Add a subtle dark/light gradient overlay to make sure text is readable against the background art */}
              <div className="absolute inset-0 bg-white/20"></div>

              <div className="relative z-10 flex flex-col items-center justify-center h-full pt-10">
                <div className="text-4xl font-serif text-stone-800 tracking-[0.8em] mb-6 font-bold opacity-90" style={{ textShadow: '0 2px 10px rgba(255,255,255,0.8)' }}>
                  待启画卷
                </div>
                <div className="w-12 h-[1px] bg-stone-800/20 mb-6"></div>
                <p className="text-sm font-sans mt-2 text-stone-700 tracking-[0.25em] max-w-sm leading-8 bg-white/30 px-8 py-5 rounded-3xl backdrop-blur-md border border-white/40 shadow-sm font-medium text-center">
                  请在左侧选择一首诗词，<br />开启“诗中有画，画中有诗”的唯美意境。
                </p>
              </div>
            </motion.div>
          )}

          {(imageUrl || isGenerating) && (
            <motion.div
              key="output-state"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Image Container - Prioritized */}
              <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* The 16:9 Box that contains both Image and Animation */}
                  <div style={{ containerType: 'size' }} className="relative aspect-video max-w-full max-h-full w-full flex items-center justify-center">
                    {/* Fly-in Animation Characters */}
                    <AnimatePresence>
                      {isAnimating && (
                        <div className="absolute inset-0 z-40 pointer-events-none">
                          {animatingChars.map((item, i) => (
                            <motion.div
                              key={i}
                              initial={{
                                x: -1920,
                                top: `${item.targetY}%`,
                                opacity: 0,
                                scale: 1
                              }}
                              animate={{
                                x: 0,
                                left: `${item.targetX}%`,
                                top: `${item.targetY}%`,
                                opacity: 1,
                                scale: 1
                              }}
                              transition={{
                                duration: 1.0,
                                delay: item.delay / 1000,
                                ease: "easeOut"
                              }}
                              style={{
                                position: 'absolute',
                                transform: 'translate(-50%, 0)',
                                color: item.textColor || 'rgba(255, 255, 255, 0.95)',
                                textShadow: item.cssTextShadow || item.shadowColor || 'none',
                                // match CanvasOverlay sizes exactly using container query height:
                                // title = 32px, author = 32px, content = 48px, seal = 24px
                                // relative to 1080 height: 32/1080 = 2.963cqh, 48/1080 = 4.444cqh, 24/1080 = 2.222cqh
                                fontSize: item.isSeal ? '2.222cqh' : (item.type === 'title' || item.type === 'author') ? '2.963cqh' : '4.444cqh',
                                filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.1))',
                                width: item.isSeal ? 'auto' : 'auto',
                                height: item.isSeal ? 'auto' : 'auto',
                                backgroundColor: item.isSeal ? 'rgba(201, 42, 42, 0.9)' : 'transparent',
                                padding: item.isSeal ? '0.925cqh 0.74cqh' : '0',
                                borderRadius: item.isSeal ? '0.555cqh' : '0',
                                border: item.isSeal ? '1px solid rgba(255,255,255,0.6)' : 'none',
                              }}
                              className={`${selectedFont} pointer-events-none ${item.isSeal ? 'flex flex-col items-center justify-center' : ''}`}
                            >
                              {item.isSeal ? (
                                item.text.split('').map((char: string, idx: number) => (
                                  <span key={idx} style={{ color: 'rgba(255,255,255,0.95)', textShadow: 'none', lineHeight: 1 }}>{char}</span>
                                ))
                              ) : (
                                item.char
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </AnimatePresence>

                    {isGenerating && !imageUrl ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden z-50">
                        {/* Immersive Ink Wash Background (Blended with main background) */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
                          {[...Array(4)].map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{
                                opacity: [0, 0.2, 0],
                                scale: [1, 2.5, 3],
                                x: [Math.sin(i) * 150, Math.sin(i) * 300],
                                y: [Math.cos(i) * 150, Math.cos(i) * 300],
                              }}
                              transition={{
                                duration: 15 + i * 5,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-black blur-[150px] rounded-full will-change-transform"
                            />
                          ))}
                        </div>

                        {/* Static Container with Perspective */}
                        <div className="relative w-full h-full flex flex-col items-center justify-center" style={{ perspective: '1200px' }}>

                          {/* Animated 3D Group */}
                          <motion.div
                            animate={{
                              rotateX: [32, 35, 32],
                              rotateY: [-3, 3, -3]
                            }}
                            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                            className="relative w-80 h-80 flex items-center justify-center"
                            style={{ transformStyle: 'preserve-3d' }}
                          >
                            {/* 3D Ink Stone Box */}
                            <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}>
                              {/* Top Surface */}
                              <div className="absolute inset-0 bg-stone-900 rounded-3xl shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)] border-2 border-stone-800 transform-gpu" style={{ transform: 'translateZ(0px)' }}>
                                <div className="absolute inset-8 rounded-2xl bg-stone-950 shadow-[inset_0_15px_40px_rgba(0,0,0,1)] overflow-hidden">
                                  <motion.div
                                    animate={{
                                      backgroundPosition: ['0% 0%', '100% 100%'],
                                      opacity: [0.7, 0.9, 0.7]
                                    }}
                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-800 via-black to-stone-900 bg-[length:200%_200%] will-change-[background-position]"
                                  />
                                </div>
                              </div>
                              {/* Sides */}
                              <div className="absolute bottom-0 left-0 right-0 h-10 bg-stone-950 rounded-b-3xl origin-top" style={{ transform: 'rotateX(-90deg) translateZ(-40px)' }}></div>
                              <div className="absolute top-0 left-0 right-0 h-10 bg-stone-950 rounded-t-3xl origin-bottom" style={{ transform: 'rotateX(90deg) translateZ(-40px)' }}></div>
                              <div className="absolute top-0 bottom-0 left-0 w-10 bg-stone-950 rounded-l-3xl origin-right" style={{ transform: 'rotateY(90deg) translateZ(-40px)' }}></div>
                              <div className="absolute top-0 bottom-0 right-0 w-10 bg-stone-950 rounded-r-3xl origin-left" style={{ transform: 'rotateY(-90deg) translateZ(-40px)' }}></div>
                              <div className="absolute inset-0 bg-stone-950 rounded-3xl shadow-2xl" style={{ transform: 'translateZ(-40px)' }}></div>
                            </div>

                            {/* Ink Spreading */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ transform: 'translateZ(2px)' }}>
                              {[1, 2].map((i) => (
                                <motion.div
                                  key={i}
                                  animate={{
                                    scale: [1, 1.6, 1.3],
                                    opacity: [0.2, 0.4, 0.2],
                                    rotate: [0, 180 * i, 0],
                                  }}
                                  transition={{ duration: 8 + i, repeat: Infinity, ease: "easeInOut" }}
                                  className={`absolute w-40 h-40 bg-black blur-${i === 1 ? 'xl' : '2xl'} rounded-full will-change-transform`}
                                ></motion.div>
                              ))}
                            </div>

                            {/* 3D Ink Stick (Proper 3D Box) */}
                            <motion.div
                              animate={{
                                rotateZ: 360,
                                x: [0, 25, 0, -25, 0],
                                y: [0, -25, 0, 25, 0],
                              }}
                              transition={{
                                rotateZ: { duration: 12, repeat: Infinity, ease: "linear" },
                                x: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                                y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                              }}
                              className="absolute w-14 h-36 z-30"
                              style={{
                                transformStyle: 'preserve-3d',
                                backfaceVisibility: 'hidden',
                                transform: 'rotateX(55deg) translateZ(60px)' // Tilt it upright
                              }}
                            >
                              {/* Front Face */}
                              <div className="absolute inset-0 bg-stone-800 border-stone-700 border flex flex-col items-center justify-start pt-6 shadow-2xl" style={{ transform: 'translateZ(6px)' }}>
                                <div className="w-2.5 h-16 bg-yellow-600/40 rounded-full mb-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"></div>
                                <div className="text-[12px] text-yellow-600/70 font-serif leading-tight tracking-[0.3em] font-bold">徽<br />墨</div>
                              </div>
                              {/* Back Face */}
                              <div className="absolute inset-0 bg-stone-900" style={{ transform: 'translateZ(-6px) rotateY(180deg)' }}></div>
                              {/* Left Face */}
                              <div className="absolute top-0 bottom-0 left-0 w-[12px] bg-stone-850 origin-left" style={{ transform: 'rotateY(-90deg)' }}></div>
                              {/* Right Face */}
                              <div className="absolute top-0 bottom-0 right-0 w-[12px] bg-stone-750 origin-right" style={{ transform: 'rotateY(90deg)' }}></div>
                              {/* Top Face */}
                              <div className="absolute top-0 left-0 right-0 h-[12px] bg-stone-700 origin-top" style={{ transform: 'rotateX(90deg)' }}></div>
                              {/* Bottom Face (The grinding surface) */}
                              <div className="absolute bottom-0 left-0 right-0 h-[12px] bg-stone-950 origin-bottom" style={{ transform: 'rotateX(-90deg)' }}></div>
                            </motion.div>

                            {/* Flying Ink Splatters */}
                            {[...Array(10)].map((_, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0, translateZ: 0 }}
                                animate={{
                                  opacity: [0, 0.7, 0],
                                  scale: [0, 1.2, 1.8],
                                  x: [0, (Math.sin(i) * 250)],
                                  y: [0, (Math.cos(i) * 250)],
                                  translateZ: [0, 300]
                                }}
                                transition={{
                                  duration: 4 + Math.random(),
                                  repeat: Infinity,
                                  delay: i * 0.4,
                                  ease: "easeOut"
                                }}
                                className="absolute w-2.5 h-2.5 bg-black rounded-full blur-[1px] z-40 will-change-transform"
                              />
                            ))}
                          </motion.div>

                          {/* Text labels */}
                          <div className="mt-20 z-50 text-center">
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="font-sans text-base text-stone-700 tracking-[0.4em] animate-pulse font-medium"
                            >
                              正在为您开启“诗中有画，画中有诗”的唯美意境...
                            </motion.p>
                          </div>
                        </div>
                      </div>
                    ) : imageUrl ? (
                      <CanvasOverlay
                        imageUrl={imageUrl}
                        title={currentPoem.title}
                        author={currentPoem.author}
                        dynasty={currentPoem.dynasty}
                        content={currentPoem.content}
                        styleId={selectedStyleId}
                        showText={showOverlayText}
                        layoutInfo={currentLayout || undefined}
                        onExportCard={handleExportCard}
                        isExporting={isExporting}
                        fontFamily={
                          selectedFont === 'font-calligraphy' ? '"Zhi Mang Xing", cursive' :
                            selectedFont === 'font-brush' ? '"Ma Shan Zheng", cursive' :
                              '"Long Cang", cursive'
                        }
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Analysis Area - Below the image */}
              {analysis && imageUrl && (
                <div className="flex-none p-8 pt-0 grid grid-cols-2 gap-6">
                  <div className="bg-white/40 backdrop-blur-md p-6 rounded-3xl shadow-sm group border border-white/20">
                    <h3 className="text-sm font-bold tracking-[0.2em] text-red-900/60 font-serif mb-4 flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-red-800/60"></span>
                      诗意解析
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed font-sans line-clamp-3 overflow-hidden h-[4.5rem]">
                      {analysis.analysis}
                    </p>
                  </div>
                  <div className="bg-white/40 backdrop-blur-md p-6 rounded-3xl shadow-sm group border border-white/20">
                    <h3 className="text-sm font-bold tracking-[0.2em] text-red-900/60 font-serif mb-4 flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-red-800/60"></span>
                      作者介绍
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed font-sans line-clamp-3 overflow-hidden h-[4.5rem]">
                      {analysis.authorIntro || (analysis as any).composition || "暂无介绍"}
                    </p>
                  </div>
                </div>
              )}

              {/* Invisible StudyCard component for drawing the export image */}
              <div className="fixed overflow-hidden pointer-events-none" style={{ left: '-9999px', top: 0 }}>
                {analysis && analysis.pinyinData && imageUrl && (
                  <StudyCard
                    ref={studyCardRef}
                    title={currentPoem.title}
                    author={currentPoem.author}
                    dynasty={currentPoem.dynasty}
                    imageUrl={imageUrl}
                    analysis={analysis.analysis}
                    authorIntro={analysis.authorIntro}
                    pinyinData={analysis.pinyinData}
                    vocabulary={analysis.vocabulary}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <audio ref={audioRef} src="/bgm.mp3" loop />
    </div>
  );
}


