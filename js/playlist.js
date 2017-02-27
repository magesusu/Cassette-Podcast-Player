
function escape_html(string) {
  var data = string.replace(/[&'`"<>]/g, function(match) {
    return {
      '&': '＆',
      "'": '’',
      '`': '’',
      '"': '”',
      '<': '＜',
      '>': '＞',
    }[match]
  });
return data;
}

