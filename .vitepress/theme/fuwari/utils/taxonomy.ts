const englishTaxonomy: Record<string, string> = {
  '廢文': 'Ramblings',
  '心得': 'Reflections',
  '開箱': 'Unboxing',
  '遊記': 'Travel',
  '隨筆': 'Essays',
  '科技心得': 'Tech Reflections',
  '福利': 'Perks',
  '活動心得': 'Event Reflections',
  '技術分享': 'Tech',
  '心境': 'State of Mind',
  '出遊': 'Outings',
  '關係': 'Relationships',
  '生活觀察': 'Life Observations',
  '心情': 'Feelings',
  '自省': 'Self-Reflection',
  '感情': 'Relationships',
  '任天堂': 'Nintendo',
  '主機': 'Consoles',
  '生日': 'Birthday',
  '禮物': 'Gifts',
  '生活': 'Life',
  '自由': 'Freedom',
  '家庭關係': 'Family Relationships',
  '情緒勒索': 'Emotional Blackmail',
  '自我成長': 'Self-Growth',
  '颱風假': 'Typhoon Day Off',
  '爆氣': 'Rant',
  '地方政府': 'Local Government',
  '北北基': 'Taipei–New Taipei–Keelung',
  '崩潰': 'Breakdown',
  '病厭厭': 'Feeling Ill',
  '人生跑馬燈': 'Life Flashbacks',
  '遊戲主機': 'Game Consoles',
  '新手開箱': 'First Unboxing',
  '安卓': 'Android',
  '前端工程': 'Frontend Engineering',
  '重構': 'Refactoring',
  '維護': 'Maintenance',
  '前端': 'Frontend',
  '金氏世界紀錄': 'Guinness World Records',
  '楓之谷': 'MapleStory',
  '遊戲人生': 'Gaming Life',
  '咖波': 'Capoo',
  '學生優惠': 'Student Discount',
  '同志': 'LGBTQ+',
  '遊行': 'Pride Parade',
  '台北': 'Taipei',
  '生活紀錄': 'Life Log',
  '手機': 'Smartphones',
  '穿戴裝置': 'Wearables',
  '聚會': 'Meetup',
  '巴哈姆特': 'Bahamut',
  '板主聚': 'Moderator Meetup',
  '網聚': 'Community Meetup',
}

export function taxonomyLabel(value: string, english: boolean) {
  return english ? englishTaxonomy[value] || value : value
}

export function uniqueTaxonomies(values: string[], english: boolean) {
  const labels = new Set<string>()
  return values.filter((value) => {
    const label = taxonomyLabel(value, english).toLocaleLowerCase(english ? 'en' : 'zh-TW')
    if (labels.has(label)) return false
    labels.add(label)
    return true
  })
}
