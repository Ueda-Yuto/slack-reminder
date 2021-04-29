var SLACK_TOKEN = "";

function main(){
  //直近のmtgのタイムスタンプとスプシの行数を取得する。
  var recentMTG = getMostRecentMTG();
  var timestamp = recentMTG[0];
  var row = recentMTG[1];

  //delete schedule
  if(row != 0){
    deleteSchedule(row);
  }
  
  if(timestamp == 0){
    Logger.log("No meeting");
    return;
  }
  var reaction_members = get_reactions_member(timestamp);
  if (reaction_members == 0){
     Logger.log("No Reactions");
    sendMessage_thread('<!channel>\nリアクションがなかったのでリマインドです。MTGに参加してください。',timestamp, true);
    return;
  }

  var message = '';

  var nameList = getNameList();

  //ユーザーのstatusを確認し、離席中ならメンションをうながす
  for (let i　=　0; i < reaction_members.length; i++){
     var user_id = reaction_members[i];
     //Logger.log(i,user_id);
     var status = getUserPresence(user_id);
     //var status = 'away'
     //Logger.log(status);

     if(status == 'away'){
       var msg = msgResponseForUsers(nameList, user_id);
       message += '<@' + user_id + '> ' + msg + '\n';
     }
  }

  if (message.length > 0){
    sendMessage_thread(message, timestamp, true);
  }else{
    sendMessage_thread('全員出席です！',timestamp, false);
  }

}

//メッセージを親のスレッドに返信という形で送る.boolはチャンネルにも投稿するのかどうかのブール値
function sendMessage_thread(message, thread_ts, bool){
  Logger.log(message,thread_ts);
  //送るパラメータの定義
  var payload = {
    "token" : "",
    "channel" : "",
    //"as_user" : "true", //tureだと自分が発言しているようになる
    "text" : message,
    "reply_broadcast" : bool,
    "thread_ts" : thread_ts
  }

  var options = {
    "method" : "POST",
    "payload" : payload
  }
  var response = UrlFetchApp.fetch("https://slack.com/api/chat.postMessage", options);
  var response_json = JSON.parse(response);

  Logger.log(response_json);
}

//特定の投稿に関してリアクションをしたユーザーのIDを配列として返す
function get_reactions_member(timestamp) {
  Logger.log(timestamp);
  //送るパラメータの定義
  var payload = {
    "token" : SLACK_TOKEN,
    "channel" : "",
    "timestamp": timestamp
  }

  var options = {
    "method" : "GET",
    "payload" : payload
  }

  var url = "https://slack.com/api/reactions.get";

  var response = UrlFetchApp.fetch(url, options);

  var response_json = JSON.parse(response);
  Logger.log(response_json);
  //responseがミスかリアクション0のとき0を返す
  if (response_json.ok == false || response_json.message.hasOwnProperty('reactions') == false) {
    return 0;
  }
  var members = response_json["message"]["reactions"][0]["users"];
  //Logger.log(response);
  //Logger.log(members);
  
  return members; //list of user_id
}

//対象のユーザーが離席中かログイン中かを確認する
function getUserPresence(user_id){
  //送るパラメータの定義
  Logger.log(user_id);
  var payload = {
    "token" : SLACK_TOKEN,
    "user" : user_id
  }

  var options = {
    "method" : "GET",
    "payload" : payload
  }

  var url = "https://slack.com/api/users.getPresence";

  var response = UrlFetchApp.fetch(url, options);
  var response_json = JSON.parse(response);
  var result = response_json["presence"];

  //Logger.log(response.getContentText());
  Logger.log(result);

  // presence or away
  return result;
}

//名簿リストの一覧を取得
function getNameList() {
  var ss_id = ''; //スプレッドシートのIDを指定
  var sh_name = 'nameList'; //スプレッドシートのシート名を指定。
  var spreadsheet = SpreadsheetApp.openById(ss_id);
  var sheet = spreadsheet.getSheetByName(sh_name);
  var search = 'A2:D' + sheet.getLastRow();
  const range = sheet.getRange(search);
  return range.getValues();
}

//usr_idに対応するメッセージを返す
function msgResponseForUsers(nameList,user_id){
  for (i = 0; i < nameList.length; i++) {
    if (nameList[i][0] == user_id) {
      return nameList[i][2];
    }
  }
  return 'MTGです。';
}

//現在時刻から5分以内のもののtimestampとそのスプシの行数を取得する。ない場合は0を返す
function getMostRecentMTG(){
  var schedulelist = getScheduleList();
  var nowDate = new Date();
  //Logger.log(nowDate);

  for(i = 0; i<schedulelist.length; i++){
    var day = schedulelist[i][1];
    var date = schedulelist[i][2];
    var input_date = day + ' ' + date;
    //Logger.log(input_date);
    var mtgDate = new Date(input_date);
    //Logger.log(mtgDate);

    //差分を計算して、10分以内のものに関してtimestampを返す
    var diff_date = (mtgDate - nowDate) / 1000 / 60;
    //Logger.log(diff_date);
    if (diff_date < 5 && diff_date > -1) {
      return [schedulelist[i][0], i + 2];
    }
  } 
  return [0,0];

}

//Scheduleリストの一覧を取得
function getScheduleList() {
  var ss_id = ''; //スプレッドシートのIDを指定
  var sh_name = 'schedule'; //スプレッドシートのシート名を指定。
  var spreadsheet = SpreadsheetApp.openById(ss_id);
  var sheet = spreadsheet.getSheetByName(sh_name);
  var search = 'A2:D' + sheet.getLastRow();
  const range = sheet.getRange(search);
  return range.getValues();
}

//Delete schedule
function deleteSchedule(row){
  var ss_id = ''; //スプレッドシートのIDを指定
  var sh_name = 'schedule'; //スプレッドシートのシート名を指定。
  var spreadsheet = SpreadsheetApp.openById(ss_id);
  var sheet = spreadsheet.getSheetByName(sh_name);
  sheet.deleteRows(row);
}