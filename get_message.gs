function doPost(e) {
  //var params = JSON.parse(e.postData.getDataAsString()); //verify challenge
  //return ContentService.createTextOutput(params.challenge); //verify challenge
  var params = JSON.parse(e.postData.getDataAsString());
  if (params.event.user!=""){
    
    var schedule_list = getMessageList(params);
    writeScheduleList(schedule_list);
    
  }
}

function getMessageList(params) {
  var output_list = [];
  
  var ts = params.event.ts;
  var message = params.event.text
  var message_list = message.split('\n');
  
  output_list.push(ts, message_list.slice(1))
  return output_list;
}

//投稿された内容の書式をチェックし、ただしかったらスプシに書き込む。それ以外はエラー処理としてフォーマットの形式をメッセージとしてスレッド化する。
function writeScheduleList(schedule_list) {
  var ss_id = ''; //スプレッドシートのIDを指定
  var sh_name = 'schedule'; //スプレッドシートのシート名を指定。
  var spreadsheet = SpreadsheetApp.openById(ss_id);
  var sheet = spreadsheet.getSheetByName(sh_name);
  var last = sheet.getLastRow() + 1;
  var bool_format_length = schedule_list.length == 2 && schedule_list[1].length >= 3;
  var bool_format_string = false;
  if (bool_format_length) {
    var date = schedule_list[1][0];
    var time = schedule_list[1][1];
    date_list = date.split('/');
    time_list = time.split(':');
    if (date_list.length == 3 && time_list.length == 2　&& date_list[0].length == 4 && date_list[1].length == 2 && date_list[2].length == 2 && time_list[0].length == 2 && time_list[1].length == 2) {
      var year = Number(date_list[0]);
      var month = Number(date_list[1]);
      var day = Number(date_list[2]);
      if (year >= 1000 && year < 10000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        var hour = Number(time_list[0]);
        var min = Number(time_list[1]);
        if (hour >= 0 && hour <= 24 && min >= 0 && min <= 59) {
          bool_format_string = true;
        }
      }
    }
  }
  
  if (bool_format_length && bool_format_string) {
    sheet.getRange('A' + last + ':D' + last).setValues([[schedule_list[0], schedule_list[1][0], schedule_list[1][1] + ':00', schedule_list[1][2]]]);
    sendMessage('<!channel>\n参加する人は、上のメッセージに * 必ず * リアクションしてください。',schedule_list[0])
  } else {
    sendMessage('！！！エラー！！！\n下のフォーマットに従って予定を入力してください（０埋め）。\n---------\n@Slack-Bot\nYYYY/MM/DD\nHH:MM\nschedule name\n（description）',schedule_list[0]);
  }
}

//メッセージを親のスレッドに返信という形で送る
function sendMessage(message,thread_ts){
  Logger.log(message);
  //送るパラメータの定義
  var payload = {
    "token" : "",
    "channel" : "",
    "as_user" : "true", //tureだと自分が発言しているようになる
    "text" : message,
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