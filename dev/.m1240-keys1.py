import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
en = '''  "manual.doorsTitle": "The doors that decide",
  "manual.doorsBody": "Three desks let the model RULE, not just answer — and every ruling is re-proved against the world's own numbers before you may see it. When a ruling is refused, the fold's own deterministic answer speaks instead, openly, beside whatever the model said.",
  "manual.doorsChair": "The Selection Chair (/chair): the model names a World XI from the world's strongest sixty. Eleven players, one keeper, nothing outside the pool — and the fold's own XI stands beside it for comparison.",
  "manual.doorsDesk": "The Training Desk (/desk): the model reads your player's own dossier and prescribes the week — which attributes, how many minutes. A lawful prescription can be ADOPTED straight into your plan, so the model's analysis lands as real training.",
  "manual.doorsBroker": "The Transfer Broker (/broker): a fee is on the table for the world's most valuable player. The model rules ACCEPT, REJECT or COUNTER with its own counter-fee; the fold rules by the same thresholds, and the two are shown side by side — disagreement included.",
  "manual.doorsBoards": "Four boards read the world's shape: the Keepers' Union names every club's number one behind its clean-sheet record; the Congested Calendar reads the turnaround between fixtures; the Cliff measures the drop from a club's best player to its eleventh; the Talent Map shows where the world's players come from.",
'''
zh = '''  "manual.doorsTitle": "会做决定的門",
  "manual.doorsBody": "三张席子让模型「裁决」而不只是「回答」——每一道裁决在你能看到之前，都对着世界自己的数字重新验过。裁决被拒时，折叠自己的确定性答案公开代答，与模型所说的并列展示。",
  "manual.doorsChair": "选人席（/chair）：模型从世界最强的六十人里点名一支世界十一人。十一名球员、一名门将、池外无一——折叠自己的十一人就在旁边，可供对照。",
  "manual.doorsDesk": "训练处方席（/desk）：模型读你球员自己的档案，开出这一周——练哪些属性、多少分钟。合法的处方可以直接「采纳」进你的计划，模型的分析由此落成真实的训练。",
  "manual.doorsBroker": "转会经纪人（/broker）：桌上摆着对世界最贵球员的报价。模型裁接受、拒绝或还价，还价带自己的金额；折叠按同一套阈值裁，两者并列展示——包括分歧。",
  "manual.doorsBoards": "四块榜读出世界的形状：门将工会点名每队头号门将身后的零封记录；魔鬼赛程读出比赛之间的轮换；断层榜量出头牌到第十一名的落差；人才版图显示世界的球员从哪里来。",
'''
tw = '''  "manual.doorsTitle": "會做決定的門",
  "manual.doorsBody": "三張席子讓模型「裁決」而不只是「回答」——每一道裁決在你能看到之前，都對著世界自己的數字重新驗過。裁決被拒時，摺疊自己的確定性答案公開代答，與模型所說的並列展示。",
  "manual.doorsChair": "選人席（/chair）：模型從世界最強的六十人裡點名一支世界十一人。十一名球員、一名門將、池外無一——摺疊自己的十一人就在旁邊，可供對照。",
  "manual.doorsDesk": "訓練處方席（/desk）：模型讀你球員自己的檔案，開出這一週——練哪些屬性、多少分鐘。合法的處方可以直接「採納」進你的計畫，模型的分析由此落成真實的訓練。",
  "manual.doorsBroker": "轉會經紀人（/broker）：桌上擺著對世界最貴球員的報價。模型裁接受、拒絕或還價，還價帶自己的金額；摺疊按同一套閾值裁，兩者並列展示——包括分歧。",
  "manual.doorsBoards": "四塊榜讀出世界的形狀：門將工會點名每隊頭號門將身後的零封紀錄；魔鬼賽程讀出比賽之間的輪換；斷層榜量出頭牌到第十一名的落差；人才版圖顯示世界的球員從哪裡來。",
'''
anchor_en = '  "manual.epicsStep4": '
i = s.find(anchor_en)
assert i > 0
# find the end of that line and insert after it
line_end = s.find("\n", i)
s = s[:line_end] + "\n" + en.rstrip("\n") + s[line_end:]
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("en keys added (en anchor)")
