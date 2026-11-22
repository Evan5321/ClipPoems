import type { CorpusFragment } from '@/types/corpus';

/** 市场筛选分类 key */
export type MarketCategory = 'classical' | 'modern' | 'idiom' | 'daily';

/**
 * 市场语料包 — 字段与本地 CustomCorpusPack 兼容，
 * 「导入到我的语料」可直接调用 corpusStore.importCorpusPack(name, fragments, description)。
 */
export interface MarketPack {
  id: string;
  name: string;
  description?: string;
  /** 市场分类（筛选用） */
  category: MarketCategory;
  /** 封面大图标（emoji） */
  icon: string;
  /** 封面渐变色 */
  gradient: string;
  /** 发布方 */
  author?: string;
  /** 虚构的下载数（预览版展示用） */
  downloads?: number;
  tags: string[];
  fragments: CorpusFragment[];
}

function frag(
  id: string,
  text: string,
  extra: Partial<CorpusFragment> & { source: string },
): CorpusFragment {
  return {
    id,
    text,
    source: extra.source,
    author: extra.author,
    dynasty: extra.dynasty,
    context: extra.context,
    wordCount: text.replace(/\s/g, '').length,
    tags: extra.tags ?? [],
    corpusId: extra.corpusId ?? 'market',
  };
}

const CLASSICAL_1: CorpusFragment[] = [
  frag('mk-tang-01', '海内存知己，天涯若比邻', { source: '送杜少府之任蜀州', author: '王勃', dynasty: '唐', tags: ['友情', '离别'] }),
  frag('mk-tang-02', '大漠孤烟直，长河落日圆', { source: '使至塞上', author: '王维', dynasty: '唐', tags: ['边塞', '写景'] }),
  frag('mk-tang-03', '会当凌绝顶，一览众山小', { source: '望岳', author: '杜甫', dynasty: '唐', tags: ['壮志', '写景'] }),
  frag('mk-tang-04', '露从今夜白，月是故乡明', { source: '月夜忆舍弟', author: '杜甫', dynasty: '唐', tags: ['思乡', '月亮'] }),
  frag('mk-tang-05', '举头望明月，低头思故乡', { source: '静夜思', author: '李白', dynasty: '唐', tags: ['思乡'] }),
  frag('mk-tang-06', '孤帆远影碧空尽，唯见长江天际流', { source: '黄鹤楼送孟浩然之广陵', author: '李白', dynasty: '唐', tags: ['送别', '长江'] }),
  frag('mk-tang-07', '随风潜入夜，润物细无声', { source: '春夜喜雨', author: '杜甫', dynasty: '唐', tags: ['春雨'] }),
  frag('mk-tang-08', '忽如一夜春风来，千树万树梨花开', { source: '白雪歌送武判官归京', author: '岑参', dynasty: '唐', tags: ['冬天', '雪'] }),
  frag('mk-tang-09', '同是天涯沦落人，相逢何必曾相识', { source: '琵琶行', author: '白居易', dynasty: '唐', tags: ['际遇'] }),
  frag('mk-tang-10', '春蚕到死丝方尽，蜡炬成灰泪始干', { source: '无题', author: '李商隐', dynasty: '唐', tags: ['深情'] }),
];

const SONG_CI: CorpusFragment[] = [
  frag('mk-song-01', '但愿人长久，千里共婵娟', { source: '水调歌头', author: '苏轼', dynasty: '宋', tags: ['月亮', '思念'] }),
  frag('mk-song-02', '大江东去，浪淘尽，千古风流人物', { source: '念奴娇·赤壁怀古', author: '苏轼', dynasty: '宋', tags: ['怀古', '长江'] }),
  frag('mk-song-03', '醉里挑灯看剑，梦回吹角连营', { source: '破阵子', author: '辛弃疾', dynasty: '宋', tags: ['壮志', '军旅'] }),
  frag('mk-song-04', '众里寻他千百度，蓦然回首，那人却在灯火阑珊处', { source: '青玉案·元夕', author: '辛弃疾', dynasty: '宋', tags: ['元夕', '灯火'] }),
  frag('mk-song-05', '寻寻觅觅，冷冷清清，凄凄惨惨戚戚', { source: '声声慢', author: '李清照', dynasty: '宋', tags: ['愁绪'] }),
  frag('mk-song-06', '莫道不销魂，帘卷西风，人比黄花瘦', { source: '醉花阴', author: '李清照', dynasty: '宋', tags: ['秋天', '相思'] }),
  frag('mk-song-07', '无可奈何花落去，似曾相识燕归来', { source: '浣溪沙', author: '晏殊', dynasty: '宋', tags: ['伤春'] }),
  frag('mk-song-08', '衣带渐宽终不悔，为伊消得人憔悴', { source: '蝶恋花', author: '柳永', dynasty: '宋', tags: ['深情'] }),
];

const MODERN: CorpusFragment[] = [
  frag('mk-mod-01', '面朝大海，春暖花开', { source: '面朝大海，春暖花开', author: '海子', tags: ['希望', '大海'] }),
  frag('mk-mod-02', '你站在桥上看风景，看风景的人在楼上看你', { source: '断章', author: '卞之琳', tags: ['哲思'] }),
  frag('mk-mod-03', '轻轻的我走了，正如我轻轻的来', { source: '再别康桥', author: '徐志摩', tags: ['离别'] }),
  frag('mk-mod-04', '黑夜给了我黑色的眼睛，我却用它寻找光明', { source: '一代人', author: '顾城', tags: ['光明', '黑夜'] }),
  frag('mk-mod-05', '卑鄙是卑鄙者的通行证，高尚是高尚者的墓志铭', { source: '回答', author: '北岛', tags: ['批判'] }),
  frag('mk-mod-06', '我如果爱你，绝不像攀援的凌霄花', { source: '致橡树', author: '舒婷', tags: ['爱情'] }),
  frag('mk-mod-07', '从明天起，做一个幸福的人，喂马，劈柴，周游世界', { source: '面朝大海，春暖花开', author: '海子', tags: ['生活'] }),
  frag('mk-mod-08', '撑着油纸伞，独自彷徨在悠长、悠长又寂寥的雨巷', { source: '雨巷', author: '戴望舒', tags: ['雨', '江南'] }),
];

const IDIOM: CorpusFragment[] = [
  frag('mk-idiom-01', '破釜沉舟', { source: '史记·项羽本纪', context: '项羽打破炊具、沉掉渡船，以示决一死战', tags: ['成语'] }),
  frag('mk-idiom-02', '卧薪尝胆', { source: '史记·越王勾践世家', context: '越王勾践睡柴草、尝苦胆，发愤图强复国', tags: ['成语'] }),
  frag('mk-idiom-03', '完璧归赵', { source: '史记·廉颇蔺相如列传', context: '蔺相如将和氏璧完好送回赵国', tags: ['成语'] }),
  frag('mk-idiom-04', '负荆请罪', { source: '史记·廉颇蔺相如列传', context: '廉颇背着荆条向蔺相如请罪', tags: ['成语'] }),
  frag('mk-idiom-05', '纸上谈兵', { source: '史记·廉颇蔺相如列传', context: '赵括空谈兵法，长平一战大败', tags: ['成语'] }),
  frag('mk-idiom-06', '三顾茅庐', { source: '三国志·诸葛亮传', context: '刘备三次拜访诸葛亮，请其出山', tags: ['成语'] }),
  frag('mk-idiom-07', '望梅止渴', { source: '世说新语', context: '曹操以前方有梅林激励士卒前行', tags: ['成语'] }),
  frag('mk-idiom-08', '闻鸡起舞', { source: '晋书·祖逖传', context: '祖逖听到鸡鸣即起床练剑，勤奋自励', tags: ['成语'] }),
];

const DAILY: CorpusFragment[] = [
  frag('mk-daily-01', '慢慢来，比较快', { source: '日常短语', tags: ['日常'] }),
  frag('mk-daily-02', '把日子过成诗', { source: '日常短语', tags: ['日常'] }),
  frag('mk-daily-03', '风起于青萍之末', { source: '宋玉《风赋》', author: '宋玉', tags: ['日常'] }),
  frag('mk-daily-04', '人间烟火气，最抚凡人心', { source: '日常短语', tags: ['日常'] }),
  frag('mk-daily-05', '所有的相遇都是久别重逢', { source: '日常短语', tags: ['日常'] }),
  frag('mk-daily-06', '万物皆有裂痕，那是光照进来的地方', { source: '莱昂纳德·科恩', author: '科恩', tags: ['日常'] }),
];

/** 官方精选语料包（预置数据，后续可从 corpus-data/ 打包生成） */
export const OFFICIAL_MARKET_PACKS: MarketPack[] = [
  {
    id: 'mp-tang',
    name: '唐诗名句精选',
    description: '唐人五言七言中的传世名句，适合抒怀、写景、赠别主题的拼贴',
    category: 'classical',
    icon: '🏮',
    gradient: 'linear-gradient(135deg, #f87171 0%, #fbbf24 100%)',
    author: '官方',
    downloads: 1286,
    tags: ['唐诗', '经典', '名句'],
    fragments: CLASSICAL_1,
  },
  {
    id: 'mp-songci',
    name: '宋词雅集',
    description: '长短句里的婉约与豪放，灯火星桥皆可入诗',
    category: 'classical',
    icon: '🫖',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)',
    author: '官方',
    downloads: 973,
    tags: ['宋词', '婉约', '豪放'],
    fragments: SONG_CI,
  },
  {
    id: 'mp-modern',
    name: '现代诗歌片段',
    description: '近现代诗人的代表句，冷峻与温柔并存',
    category: 'modern',
    icon: '🌙',
    gradient: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
    author: '官方',
    downloads: 654,
    tags: ['现代诗', '新文学'],
    fragments: MODERN,
  },
  {
    id: 'mp-idiom',
    name: '成语典故',
    description: '四字成语附典故背景，短句拼贴的实心材料',
    category: 'idiom',
    icon: '🏯',
    gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
    author: '官方',
    downloads: 431,
    tags: ['成语', '典故'],
    fragments: IDIOM,
  },
  {
    id: 'mp-daily',
    name: '日常灵感短语',
    description: '散落生活的短句，适合做画布上的点缀与情绪表达',
    category: 'daily',
    icon: '🎈',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)',
    author: '官方',
    downloads: 312,
    tags: ['日常', '灵感'],
    fragments: DAILY,
  },
];
