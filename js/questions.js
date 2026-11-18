// 設問データ（このアプリのオリジナル）
//
// axis  : 指標  'EI'（エネルギーの向き） | 'SN'（ものの見方） | 'TF'（決めるときの基準） | 'JP'（物事の進め方）
// pole  : 「そう思う」と答えたときに加点される側の文字
// quick : true の設問は「かんたん診断（24問）」でも出題する
//
// 回答は5段階（とてもそう思う／ややそう思う／どちらともいえない／あまりそう思わない／まったくそう思わない）。
// 各指標12問（両方向6問ずつ）で、出題順はアプリ側でシャッフルする。

export const QUESTIONS = [
  // ── E（外向）/ I（内向）：エネルギーの向き ──
  { id: 1, axis: 'EI', pole: 'E', quick: true, text: '人と話していると、元気がわいてくるほうだ' },
  { id: 2, axis: 'EI', pole: 'E', quick: true, text: '初めての場でも、自分から話しかけることが多い' },
  { id: 3, axis: 'EI', pole: 'E', quick: true, text: '考えごとは、人に話しながら整理するほうだ' },
  { id: 4, axis: 'EI', pole: 'E', quick: false, text: 'にぎやかな場所にいると、気分が上がるほうだ' },
  { id: 5, axis: 'EI', pole: 'E', quick: false, text: '大勢の前で話すのは、わりと好きなほうだ' },
  { id: 6, axis: 'EI', pole: 'E', quick: false, text: 'いろいろな人と広く付き合うのが好きだ' },
  { id: 7, axis: 'EI', pole: 'I', quick: true, text: '一人で過ごす時間で、エネルギーを充電するほうだ' },
  { id: 8, axis: 'EI', pole: 'I', quick: true, text: '話す前に、頭の中で考えをまとめておきたい' },
  { id: 9, axis: 'EI', pole: 'I', quick: true, text: '少数の親しい友人と、深く付き合うほうが好きだ' },
  { id: 10, axis: 'EI', pole: 'I', quick: false, text: '人前で目立つより、目立たずにいるほうが落ち着く' },
  { id: 11, axis: 'EI', pole: 'I', quick: false, text: '自分が話すより、人の話を聞く側にまわることが多い' },
  { id: 12, axis: 'EI', pole: 'I', quick: false, text: 'にぎやかな場所に長くいると、ひとりになりたくなる' },

  // ── S（感覚）/ N（直観）：ものの見方 ──
  { id: 13, axis: 'SN', pole: 'S', quick: true, text: '抽象的な話より、具体的な話のほうが好きだ' },
  { id: 14, axis: 'SN', pole: 'S', quick: true, text: 'ひらめきより、経験から得た知識を頼りにする' },
  { id: 15, axis: 'SN', pole: 'S', quick: true, text: '先のことより、目の前のことに集中したい' },
  { id: 16, axis: 'SN', pole: 'S', quick: false, text: '細かい部分の違いに、よく気がつくほうだ' },
  { id: 17, axis: 'SN', pole: 'S', quick: false, text: '新しい方法より、実績のあるやり方を選びたい' },
  { id: 18, axis: 'SN', pole: 'S', quick: false, text: 'ものごとは一つずつ、順を追って理解したい' },
  { id: 19, axis: 'SN', pole: 'N', quick: true, text: '「もしも〜だったら」と想像するのが好きだ' },
  { id: 20, axis: 'SN', pole: 'N', quick: true, text: '物事の裏にある意味やつながりを、つい考えてしまう' },
  { id: 21, axis: 'SN', pole: 'N', quick: true, text: '今のことより、これから先の可能性に心が動く' },
  { id: 22, axis: 'SN', pole: 'N', quick: false, text: 'まず全体像をつかんでから、細部を理解したい' },
  { id: 23, axis: 'SN', pole: 'N', quick: false, text: 'いつもと違う新しいやり方を試すのが好きだ' },
  { id: 24, axis: 'SN', pole: 'N', quick: false, text: 'ひらめきや直感を頼りに考えることが多い' },

  // ── T（思考）/ F（感情）：決めるときの基準 ──
  { id: 25, axis: 'TF', pole: 'T', quick: true, text: '何かを決めるときは、筋が通っているかどうかを重視する' },
  { id: 26, axis: 'TF', pole: 'T', quick: true, text: '相談されたら、まず解決策を一緒に考えたい' },
  { id: 27, axis: 'TF', pole: 'T', quick: true, text: '話し合いでは、正しい結論にたどり着くことを大切にしたい' },
  { id: 28, axis: 'TF', pole: 'T', quick: false, text: '改善点は、はっきり率直に伝えるほうだ' },
  { id: 29, axis: 'TF', pole: 'T', quick: false, text: 'たとえ事情があっても、基準は全員に同じく当てはめたい' },
  { id: 30, axis: 'TF', pole: 'T', quick: false, text: '物事を分析して、原因を突き止めるのが好きだ' },
  { id: 31, axis: 'TF', pole: 'F', quick: true, text: '何かを決めるときは、関わる人の気持ちを大切にする' },
  { id: 32, axis: 'TF', pole: 'F', quick: true, text: '相談されたら、まず相手の気持ちに寄り添いたい' },
  { id: 33, axis: 'TF', pole: 'F', quick: true, text: '話し合いでは、みんなが納得できる結論を目指したい' },
  { id: 34, axis: 'TF', pole: 'F', quick: false, text: '人に意見を伝えるときは、言い方や伝わり方に気を配る' },
  { id: 35, axis: 'TF', pole: 'F', quick: false, text: '同じ失敗でも、その人の事情によって受け止め方を変えたい' },
  { id: 36, axis: 'TF', pole: 'F', quick: false, text: '映画や物語では、登場人物の気持ちに強く共感するほうだ' },

  // ── J（判断的態度）/ P（知覚的態度）：物事の進め方 ──
  { id: 37, axis: 'JP', pole: 'J', quick: true, text: '休日の予定は、前もって立てておきたい' },
  { id: 38, axis: 'JP', pole: 'J', quick: true, text: '締め切りのある作業は、早めに終わらせておきたい' },
  { id: 39, axis: 'JP', pole: 'J', quick: true, text: '物事は、きちんと決まっているほうが落ち着く' },
  { id: 40, axis: 'JP', pole: 'J', quick: false, text: 'やることリストを作って、順番に片づけるのが好きだ' },
  { id: 41, axis: 'JP', pole: 'J', quick: false, text: '一度決めた予定は、そのとおりに進めたい' },
  { id: 42, axis: 'JP', pole: 'J', quick: false, text: '買い物は、買うものを決めてから出かけるほうだ' },
  { id: 43, axis: 'JP', pole: 'P', quick: true, text: '休日は、その日の気分で過ごし方を決めたい' },
  { id: 44, axis: 'JP', pole: 'P', quick: true, text: '締め切り直前のほうが、集中して力を発揮できる' },
  { id: 45, axis: 'JP', pole: 'P', quick: true, text: 'すぐに決めるより、選択肢を残しておきたい' },
  { id: 46, axis: 'JP', pole: 'P', quick: false, text: '計画を立てるより、まず動きながら考えるほうだ' },
  { id: 47, axis: 'JP', pole: 'P', quick: false, text: '予定が急に変わっても、むしろ楽しめるほうだ' },
  { id: 48, axis: 'JP', pole: 'P', quick: false, text: '買い物では、その場で気に入ったものを選ぶのが楽しい' },
];

// 得点が50:50で並んだ指標だけに出題する二択の質問（左側の文字が先）
export const TIEBREAKERS = {
  EI: {
    text: 'エネルギーの充電方法として、あなたに近いのは？',
    options: [
      { pole: 'E', label: '人と過ごすと、元気が出てくる' },
      { pole: 'I', label: '一人の時間で、元気を取り戻す' },
    ],
  },
  SN: {
    text: 'ものごとをとらえるとき、あなたに近いのは？',
    options: [
      { pole: 'S', label: '今ある現実や事実を大切にする' },
      { pole: 'N', label: 'これからの可能性やアイデアにひかれる' },
    ],
  },
  TF: {
    text: '大切なことを決めるとき、あなたに近いのは？',
    options: [
      { pole: 'T', label: '筋道を立てて、冷静に判断する' },
      { pole: 'F', label: 'まわりの人の気持ちに寄り添って判断する' },
    ],
  },
  JP: {
    text: '物事の進め方として、あなたに近いのは？',
    options: [
      { pole: 'J', label: '計画を立てて、着実に進めたい' },
      { pole: 'P', label: '流れに合わせて、柔軟に進めたい' },
    ],
  },
};
