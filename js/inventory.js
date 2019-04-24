var gData;
var accessToken;
var userName;
var gQuery;

var clientID = '155634899666-1q3npshbuf5082rhebocs2h6sn0r0ef4.apps.googleusercontent.com';
var APIKey = 'AIzaSyDfDpup8u_hcdM7horU_EO9WVHPz9cElQs';
var APIScopes = 'https://www.googleapis.com/auth/fusiontables' +
               ' https://www.googleapis.com/auth/userinfo.profile';

var locationTableID = "1x05TS4UyJw7PZtR6sREYO_jZ41Kn1jn90ZkU6Rg";
var dataTableID = "1nb-ffOC31pChmFB6-z3NuCBi1xTxnTQESkH7rp0";
var boxTableID =  "1Gb-CpsxpQm26yqGNHfPhOeZumVPtjIyH4qs5i3k";

$(function () {
  $('#new-aliquot-box').click(function (e) {
    return false;
  });

  $('#box-name-input').keyup(function (event) {
    if (event.which == 13) {
      event.preventDefault();

      var str = $(this).val().trim();
      if (str.length < 3) {
        $(this).select().focus();
        return false;
      }

      History.pushState({query:str}, str, "?query=" + str);

      return false;
    }
  });

  $(window).click(function () {
    $('#new-aliquot-box').hide();
    $('#delete-button').hide();
  });

  $('#box-content-table').on('click', '.item-header', function (e) {
    var $newAliquotBox = $('#new-aliquot-box');
    var $deleteButton = $('#delete-button');
    if ($newAliquotBox.is(":visible") || $deleteButton.is(":visible") || $(this).parent().data('locked')) {
      return true;
    }
    e.preventDefault();
    $('#plasmid-form').data("name", $(this).text());
    openForm();
    return false;
  });

  $('#query-result-table').on('click', '.main', function (e) {
    e.preventDefault();
    $('#plasmid-form').data("name", $(this).find('.name').text());
    openForm();
  });

  $('#query-result-table').on('click', '.aliquot', function (e) {
    e.preventDefault();
    var boxName = $(this).text().substr(0, 6);
    $('#box-name-input').val(boxName).trigger(jQuery.Event("keyup", {
        which : 13
      }));
    return false;
  });

  $('#cancel-bttn').click(function (e) {
    e.preventDefault();
    closeForm();
  });

  $('#update-bttn').click(function (e) {
    e.preventDefault();
    var newdata = readForm();
    var plasmidName = newdata[0];
    if ($('#query-result-table').is(':visible')) {
      $('#query-result-table').find('td').each(function () {
        if ($(this).find('.name').text() == plasmidName) {
          $(this).css('color', '#B8B8B8').data('locked', true);
        }
      });
    } else {
      $('#box-content-table').find('.aliquot-cell').each(function () {
        if ($(this).find('.item-header').text() == plasmidName) {
          $(this).html('<p class="item-header">' + $('<div>').text(plasmidName).html() + '</p>' +
            '<tt><span class="item-id">A</span>Updating...<br>' +
            '<tt><span class="item-id">V</span>Updating...<br>' +
            '<tt><span class="item-id">I</span>Updating...');
          $(this).data('locked', true);
        }
      });
    }
    _updatePlasmid(newdata);
    closeForm();
  });

  $('#plasmid-form').keyup(function (e) {
    if (e.which == 27) {
      closeForm();
    }
  });

  $('#box-content-table').on('click', '.aliquot-cell', function (e) {
    var $newAliquotBox = $('#new-aliquot-box');
    var $deleteButton = $('#delete-button');
    if ($newAliquotBox.is(":visible") || $deleteButton.is(":visible") || $(this).data('locked')) {
      return true;
    }

    var name = $(this).find(".item-header");

    if (name && name.length > 0) {
      $deleteButton.data('cell', $(this)).show().css({
        left : e.pageX,
        top : e.pageY
      });
    } else {
      displayNewAliquotBox(e);
      $('#aliquot-name').select().focus().data('cell', $(this));
    }
    return false;
  });

  $('#aliquot-name').keyup(function (e) {
    if (e.which == 13) {
      $('#new-aliquot-box').hide();
      var newName = $(this).val().trim();
      if (newName.length > 0) {
        var $cell = $(this).data('cell');
        var row = $cell.parent().index();
        var col = $cell.index();
        $cell.data('locked', true);

        $cell.html('<p class="item-header">' + $('<div>').text(newName).html() + '</p>' +
          '<tt><span class="item-id">A</span>Updating...<br>' +
          '<tt><span class="item-id">V</span>Updating...<br>' +
          '<tt><span class="item-id">I</span>Updating...');
        _addAliquot($('#box-content').data('name'), row, col, newName, $cell);
      }
    }
  });

  $('#delete-button').click(function () {
    $(this).hide();
    var $cell = $(this).data('cell');
    var row = $cell.parent().index();
    var col = $cell.index();
    var name = $cell.find('.item-header').text();
    $cell.data('locked', true);
    $cell.css('color', '#B8B8B8');
    _removeAliquot($('#box-content').data('name'), row, col, name, $cell);
  });

  $('#plasmid-form .form-header').on('click', 'a', function (e) {
    e.preventDefault();
    if ($(this).text() != "others") {
      fillForm($(this).text());
      return;
    }
    var name = prompt("Copy data from which plasmid?", $('#plasmid-form #plasmid-name').text());
    if (!name) {
      return;
    }
    if (name.trim().length === 0) {
      return;
    }
    name = name.trim();
    var data = gData[name];
    if (data) {
      fillForm(data[0]);
      return;
    }
    //FIXME query server
  });

  var History = window.History;
  if ( !History.enabled ) {
    return false;
  }

  History.Adapter.bind(window,'statechange',function(){
    var State = History.getState();
    History.log(State.data, State.title, State.url);
    gQuery = State.data.query;
    if (gQuery) {
      $('#box-name-input').val(gQuery);
    } else {
      $('#box-name-input').val("");
    }
    var options = {client_id : clientID, scope : APIScopes, immediate : true};
    gapi.auth.authorize(options, handleAuthResult);
  });
});

function handleAuthResult(authResult) {
  if (authResult && !authResult.error) {
    prepareQuery();
  } else {
    gapi.auth.authorize(
	{
      client_id : clientID,
      scope : APIScopes,
      immediate : false
    }, 
	function(result) {
      if (result && !result.error) {
        prepareQuery();
      }
    });
  }
}

function prepareQuery() {
  accessToken = gapi.auth.getToken().access_token;
  var req=gapi.client.request({path: 'oauth2/v2/userinfo'});
  req.execute( function(resp){
    // console.log(resp);
    userName = resp.Name;
  });
//  gapi.client.load('fusiontables', 'v2', function () {
    doQuery();
//  });
}

function doQuery() {
  $('#box-content-table').empty().hide();
  $('#query-result-table').empty().hide();

  if (gQuery) {
    $('#box-name-input').prop('disabled', true);
    $('body').css('cursor', 'wait');

    if (gQuery.match(/[\dcC]-\w?\d-\d/)) {
      $('#box-content').data('name', gQuery);
      _getContents(gQuery);
    } else {
      $('#query-result-table').data('query', gQuery);
      _findPlasmids(gQuery);
    }
  }
}

function displayNewAliquotBox(event) {
  var x = event.pageX - 30;
  var docWidth = $(document).width();

  if (x + $('#new-aliquot-box').width() + 2 > docWidth) {
    x = docWidth - $('#new-aliquot-box').width() - 2;
  } else if (x < 2) {
    x = 2;
  }
  var ml = event.pageX - x - 5;
  if (ml > docWidth - 5) {
    ml = docWidth - 5;
  } else if (ml < 7) {
    ml = 7;
  }
  $('.arrow-box-before').css('margin-left', ml);

  $('#new-aliquot-box').show().css({
    left : x,
    top : event.pageY + 6
  });
}

function onFailure(err) {
  var name = $('#box-name-input').prop('disabled', false);
  alert(err.message);
}

function fillInfo($cell, name) {
  var plasmid = gData[name];

  if (!plasmid) {
    plasmid = [name, '', '', ''];
  }

  $cell.html('<p class="item-header">' + $('<div>').text(plasmid[0]).html() + '</p>' +
    '<tt><span class="item-id">A</span>' + $('<div>').text(plasmid[1]).html() + '<br>' +
    '<span class="item-id">V</span>' + $('<div>').text(plasmid[2]).html() + '<br>' +
    '<span class="item-id">I</span>' + $('<div>').text(plasmid[3]).html() + '</tt>');
}

function showContents(data) {
  var $table = $('#box-content-table');

  var locations = data.locations;
  var size = data.size;
  gData = jQuery.extend({}, data.data);

  for (var i = 0; i < size[0]; ++i) {
    $table.append('<tr>');
  }
  $table.find('tr').append(function (index, html) {
    return $('<td class="row-number">').text(index + 1);
  });
  for (var j = 0; j < size[1]; ++j) {
    $table.find('tr').append('<td class="aliquot-cell">');
  }
  $table.prepend('<tr>');
  var $headRow = $table.find('tr:first');
  $headRow.append('<th style="width:20px">');
  for (j = 0; j < size[1] ; ++j) {
    $headRow.append($('<th>').text(String.fromCharCode(65 + j)));
  }

  try {
    for (i in locations) {
      var line = locations[i];
      // console.log(line);
      var $cell = $table.find('tr').eq(line[0]).find('td').eq(line[1]);
      fillInfo($cell, line[2]);
    }
    $table.show();
  } catch (err) {
    alert(err.message);
  }
  $('#box-name-input').prop('disabled', false);
  $('body').css('cursor', 'default');
}

function fillQueryCell($cell, data) {
  var aliquotsStr = [];
  var a = data[9];
  for (var j in a) {
    aliquotsStr.push("<span class='aliquot'>" + a[j] + "</span>");
  }
  var $div = $('<div>');
  $cell.html("<div class='main'> <div class='note'>" + $div.text(data[7]).html() + "</div>" +
    "<div class = 'info'> <span class='name'>" + $div.text(data[0]).html() + "</span> <br>" +
    "<tt>R:</tt> " + $div.text(data[4]).html() + "<br>" +
    "<tt>A:</tt> " + $div.text(data[1]).html() + "<br>" +
    "<tt>V:</tt> " + $div.text(data[2]).html() + "<br>" +
    "<tt>I:</tt> " + $div.text(data[3]).html() + "<br> </div>" +
    "<div class='aliquots-block'>" + aliquotsStr.join('') + "</div></div>");
}

function showQueryResults(data) {
  gData = {};
  for (var i in data) {
    gData[data[i][0]] = data[i];
  }
  var $table = $('#query-result-table');

  $('#box-name-input').prop('disabled', false);
  $('body').css('cursor', 'default');

  $table.show();

  if (!data) {
    $table.html('No results.');
    return;
  }
  var curCol = 0;
  for (i in data) {
    if (curCol === 0) {
      $table.append($('<tr>'));
    }
    var $newCell = $('<td>');
    $table.find('tr').last().append($newCell);
    fillQueryCell($newCell, data[i]);
    curCol++;
    if (curCol == 3) {
      curCol = 0;
    }
  }
}

function addAliquot(retData, $cell) {
  $cell.data('locked', false);
  if (retData) {
    var name = retData[0];
    gData[name] = retData;

    fillInfo($cell, name);
  } else {
    $cell.empty();
    alert("Adding aliquot failed!");
  }
}

function removeAliquot(retData, $cell) {
  $cell.data('locked', false);
  $cell.css('color', 'black');
  if (retData) {
    $cell.empty();
  } else {
    alert("Remove aliquot failed!");
  }
}

function updatePlasmid(retData, userData) {
  var plasmidName = userData[0];
  if (retData) {
    var oldData = gData[plasmidName];
    if (oldData && oldData[9]) { // update aliquot info if available
      userData = jQuery.extend({}, userData);
      userData[9] = oldData[9];
    }
    gData[plasmidName] = userData;
  }

  if ($('#query-result-table').is(':visible')) {
    $('#query-result-table').find('td').each(function () {
      if ($(this).find('.name').text() == plasmidName) {
        fillQueryCell($(this), userData);
        $(this).css('color', 'black').data('locked', false);
      }
    });
  } else {
    $('#box-content-table').find('.aliquot-cell').each(function () {
      if ($(this).find('.item-header').text() == plasmidName) {
        fillInfo($(this), plasmidName);
        $(this).data('locked', false);
      }
    });
  }
}

function readForm() {
  var $form = $('#plasmid-form');
  var plasmidName = $form.find("#plasmid-name").text();
  var oldData = gData[plasmidName];
  var data = [plasmidName];
  data[6] = oldData[6];
  data[1] = $form.find('#alt-name').val();
  data[2] = $form.find('#vector').val();
  data[3] = $form.find('#insert').val();
  data[5] = $form.find('#tag').val();
  data[7] = $form.find('#note').val();
  data[8] = $form.find('#seq').val();

  var str = [];
  $form.find('input:checked').each(function () {
    str.push($(this).val());
  });
  var o = $form.find('#resistance-other').val().trim();
  if (o.length > 0) {
    str.push(o);
  }
  data[4] = str.join(',');
  return data;
}

function fillForm(plasmidName) {
  var data = gData[plasmidName];

  var $form = $('#plasmid-form');
  $form.find('#alt-name').val(data[1]);
  $form.find('#vector').val(data[2]);
  $form.find('#insert').val(data[3]);
  $form.find('#note').val(data[7]);
  $form.find('#seq').val(data[8]);
  $form.find('#tag').val(data[5]);

  $form.find("[type=checkbox]").prop("checked", false);
  var rsts = data[4].split(',');
  var patterns = [/^amp/i, /^(cat|cam|chlo)/i, /^kan/i, /^(spc|spec)/i, /^tet/i, /^mls/i];
  var str = [];
  for (var i in rsts) {
    var rst = rsts[i].trim();
    var matched = false;
    for (var j in patterns) {
      if (rst.match(patterns[j])) {
        $("#plasmid-form [type=checkbox]").eq(j).prop('checked', true);
        matched = true;
        break;
      }
    }
    if (!matched) {
      str.push(rst);
    }
  }
  $('#resistance-other').val(str.join(','));
}

function createHint(plasmidName) {
  var sources = [];
  var pattern = /^[a-zA-Z]+\d+/;
  var mainStr = plasmidName.match(pattern);
  if (!mainStr) {
    return null;
  }
  var numStr = mainStr[0].match(/\d+/)[0];
  var word = mainStr[0].match(/^[a-zA-Z]+/)[0];
  var num = Number(numStr);
  mainStr.push(word + (num - 1));
  mainStr.push(word + (num - 2));
  var e = new RegExp('(' + mainStr.join('|') + ')');
  for (var name in gData) {
    if (name != plasmidName) {
      if (e.test(name)) {
        sources.push(name);
        if (sources.length >= 6) {
          return sources.sort();
        }
      }
    }
  }
  if (sources.length === 0) {
    return null;
  }
  return sources.sort();
}

function openForm() {
  var $form = $('#plasmid-form');
  var plasmidName = $form.data('name');
  $form.find("#plasmid-name").text(plasmidName);

  var s = createHint(plasmidName);
  if (s === null) {
    $('#plasmid-form #copy-note').html("Copy info from <a href='#'>others</a>");
  } else {
    $.each(s, function (index, value) {
      s[index] = "<a href='#'>" + $('<div>').text(value).html() + "</a>";
    });
    $('#plasmid-form #copy-note').html('Copy info from ' + s.join(",") + " or <a href='#'>others</a>");
  }

  fillForm(plasmidName);
  var form_width = $form.outerWidth();
  $('#doc-overlay').css({
    "display" : "block",
    opacity : 0
  }).fadeTo(200, 0.3);
  $form.css({
    "display" : "block",
    "position" : "absolute",
    "opacity" : 0,
    "z-index" : 20000,
    "left" : "50%",
    "margin-left" :  - (form_width / 2) + "px",
    "top" : "100px"
  });
  $form.fadeTo(200, 1);
  $form.find('input:first').focus();
}

function closeForm() {
  $('#doc-overlay').fadeOut(200);
  $('#plasmid-form').hide();
}

function initAuth() {
  gapi.client.setApiKey(APIKey);
  var pars = location.search.replace('?', '').split('&').map(function(val){
    return val.split('=');
  });
  if (pars[0][0] == 'query') {
    var q = pars[0][1].trim();
    if ( q && q.length >=3 ) {
      History.replaceState({query: q}, q, '?query=' + q);
      gQuery = q;
      $('#box-name-input').val(gQuery);
      var options = {client_id : clientID, scope : APIScopes, immediate : true};
      gapi.auth.authorize(options, handleAuthResult);
    }
  }
}

function _sql_escape_string(str) {
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\]/g, function (char) {
    switch (char) {
    case "\0":
      return "\\0";
    case "\x08":
      return "\\b";
    case "\x09":
      return "\\t";
    case "\x1a":
      return "\\z";
    case "\n":
      return "\\n";
    case "\r":
      return "\\r";
    case "\"":
    case "'":
    case "\\":
      return "\\" + char; // prepends a backslash to backslash, percent,
      // and double/single quotes
    }
  });
}

function _sql(sqlStr, onSuccess) {
  // console.log(sqlStr);
  // avoid use gapi impl because send data using URI which is too long
  var oauthToken = gapi.auth.getToken();
  $.ajax({
    method: "POST",
    url: 'https://www.googleapis.com/fusiontables/v2/query',
	data: {sql: sqlStr},
	headers: {Authorization: 'Bearer ' + oauthToken.access_token},
	dataType: 'json'
  }).done( function(jsonResp) {
	if (jsonResp.kind == 'fusiontables#sqlresponse') {
	  onSuccess(jsonResp);
	} else {
	  console.log(xhr.responseText);
	  if (jsonResp.message) {
		alert(jsonResp.message);
      }
	}
  });
}

function _getCurrentDate() {
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth() + 1; //January is 0!
  var yyyy = today.getFullYear();
  if (dd < 10) {
    dd ='0' + dd ;
  }
  if (mm < 10) {
    mm = '0' + mm;
  }
  today = mm + '/' + dd + '/' + yyyy;
  return today;
}

function _mergeResults(prevResults, newResults) {
  if (! newResults ) {
    return prevResults;
  }
  if ( !prevResults) {
    return newResults;
  }
  var len = prevResults.length;
  for (var i in newResults) {
    var name = newResults[i][0];
    var duplicate = false;
    for (var j = 0; j < len; ++j) {
      if (prevResults[j][0] == name) {
        duplicate = true;
        break;
      }
    }
    if (!duplicate) {
      prevResults[prevResults.length] = newResults[i];
    }
  }
  return prevResults;
}

function _updatePlasmid(plasmidData) {
  var sql = "SELECT ROWID FROM " + dataTableID + " WHERE Name='" + plasmidData[0] + "'";
  _sql(sql, function(r1) {
    if (r1.rows) {
      var rowID = r1.rows[0][0];
      var sourceStr = '';
      if (plasmidData[6].length == 0) {
        sourceStr = " Source = '" + userName + "',";
      }
      sql = "UPDATE " + dataTableID + " SET "
         + " AltName='" + _sql_escape_string(plasmidData[1]) + "',"
         + " Vector='" + _sql_escape_string(plasmidData[2]) + "',"
         + " Gene='" + _sql_escape_string(plasmidData[3]) + "',"
         + " Resistance='" + _sql_escape_string(plasmidData[4]) + "',"
         + " Type='" + _sql_escape_string(plasmidData[5]) + "',"
         + sourceStr
         + " Notes='" + _sql_escape_string(plasmidData[7]) + "',"
         + " Sequence='" + _sql_escape_string(plasmidData[8]) + "' WHERE ROWID='" + rowID + "'";
      _sql(sql, function(r2) {
        updatePlasmid(r2.rows, plasmidData);
      });
    } else {
      alert('Unable to find the plasmid:' + plasmidData[0] + ' in the database' );
    }
  });
}

function _removeAliquot(boxName, row, col, contentName, $cell) {
  row = Number(row);
  col = Number(col);
  boxName = boxName.toUpperCase();
  var sql = "SELECT ROWID FROM " + locationTableID + " WHERE BoxName='" + boxName
     + "' AND Row=" + row + " AND Col=" + col + " AND ContentName='" + contentName.trim() + "'";
  _sql(sql, function(r1) {
    if (r1.rows) {
      sql = "DELETE FROM " + locationTableID + " WHERE ROWID='" + r1.rows[0][0] + "'";
      _sql(sql, function(r2) {
        removeAliquot(r2.rows, $cell)
        //return r2.rows;
      });
    } else {
      alert('Aliquot does not exisit in the database');
    }
  });
}

function _addNewPlasmid(plasmidName, $cell){
  sql = "SELECT * FROM " + dataTableID + " WHERE Name='" + plasmidName + "'";
  _sql(sql, function (r1) {
    if (r1.rows) { //already exist
      addAliquot(r1.rows[0], $cell);
    } else {
      console.log("New plasmid- attempt to create new record");
      sql = "INSERT INTO " + dataTableID + " (Name) VALUES ('" + plasmidName + "')";
      _sql(sql, function (r2) {
        if (!r2.rows) {
          alert("Failed to create new plasmid record");
        } else {
          addAliquot([plasmidName, '', '', '', '', '', '', '', ''], $cell); //new
        }
      });
    }
  });
}

function _addAliquot(boxName, row, col, contentName, $cell) {
  row = Number(row);
  col = Number(col);
  boxName = boxName.toUpperCase();
  var sql = "SELECT ROWID FROM " + locationTableID + " WHERE BoxName='" + boxName
     + "' AND Row=" + row + " AND Col=" + col;
  _sql(sql, function(r1) {
    if (! r1.rows) { // verify empty
      sql = "INSERT INTO " + locationTableID + " (BoxName, Row, Col, ContentName, StoredDate) VALUES ('"
          + boxName + "', " + row + "," + col + ",'" + contentName + "','" + _getCurrentDate() + "')";
      _sql(sql, function (r2) {
        if (!r2.rows) { //insert fail
          alert('Failed to add adliquot to database');
        } else {
          _addNewPlasmid(contentName, $cell);
        }
      });
    } else { // not empty
      alert('The location ' + boxName + ':' + row + '-' + col + ' does not seem to be empty');
    }
  });
}

function _findAliquots(data)
{
  var names = [];
  var ncol = data[0].length;
  for (var i in data) {
    names.push("'" + data[i][0] + "'");
    data[i][ncol] = [];
  }
  var sql = "SELECT * FROM " + locationTableID + " WHERE ContentName IN (" + names.join(',') + ")";
  _sql(sql, function(resp) {
    for (var i in resp.rows) {
      var row = resp.rows[i];
      var aliquotName = row[0] + ":" + row[1] + String.fromCharCode(64 + Number(row[2]));
      for (var j in data) {
        if (data[j][0] == row[3]) {
          data[j][ncol].push(aliquotName);
          break;
        }
      }
    }
    //console.log(data);
    showQueryResults(data);
  });
}

function _findPlasmids(queryStr) {
  var httpBatch = gapi.client.newBatch();
  queryStr = "'" + _sql_escape_string(queryStr) + "'";
  var sql = "SELECT * FROM " + dataTableID + " WHERE Name CONTAINS IGNORING CASE " + queryStr + " ORDER BY Name ASC";
  var allResults;
  _sql(sql, function(jsonResp) {
	  //console.log(jsonResp.rows);
	  allResults = jsonResp.rows;
	  sql = "SELECT * FROM " + dataTableID + " WHERE AltName CONTAINS IGNORING CASE " + queryStr + " ORDER BY Name ASC";
	  _sql(sql, function(jsonResp) {
		  allResults = _mergeResults(allResults, jsonResp.rows);
		  sql = "SELECT * FROM " + dataTableID + " WHERE Gene CONTAINS IGNORING CASE " + queryStr + " ORDER BY Name ASC";		  
		  _sql(sql, function(jsonResp) {
			  allResults = _mergeResults(allResults, jsonResp.rows);
			  if (! allResults ) { // found nothing
				showQueryResults(null);
			  } else {
				_findAliquots(allResults);
			  }	  			  
		  });
	  });	  
  });
}

function _getContents(boxname) {
  var nRow = 10;
  var nCol = 10;
  var listOfNames = [];
  var plasmidData = {};

  var sql = "SELECT NumRow,NumCol FROM " + boxTableID + " WHERE BoxName='" + boxname.toUpperCase() + "'";

  _sql(sql, function(r1) {
    if (r1.rows) {
      nRow = r1.rows[0][0];
      nCol = r1.rows[0][1];
    }

    sql = "SELECT Row,Col,ContentName,StoredDate FROM " + locationTableID + " WHERE BoxName='" + boxname.toUpperCase() + "'";
    _sql(sql, function (r2) {
        if (r2.rows) {
          var locationData = r2.rows;
          for (var i in r2.rows) {
            listOfNames.push("'" + locationData[i][2] + "'");
          }
          sql = "SELECT * FROM " + dataTableID + " WHERE Name in (" + listOfNames.join(',') + ")";
          _sql(sql, function (resp) {
            for (i in resp.rows) {
              var row = resp.rows[i];
              plasmidData[row[0]] = row;
            }
            //console.log(plasmidData);
            //console.log(locationData);
            showContents({locations: locationData, data: plasmidData, size: [nRow, nCol]});
          });
        } else {
          showContents({location: null, data: null, size: [nRow, nCol]});
        }
    });
  });
}
