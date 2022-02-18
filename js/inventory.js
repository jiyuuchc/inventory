var gData;
var accessToken;
var userName;
var gQuery;
var gAliquots;
var gBoxSizes;
var gPlasmids;

var clientID = '155634899666-fhpcsit4q1ns3fsq8n653dqtef9cnui1.apps.googleusercontent.com';
var APIKey = 'AIzaSyAMabFy8YY5uF20WCXYdEIcQ0hPhXb6hm0';
var APIScopes = 'https://www.googleapis.com/auth/spreadsheets ' +
               'https://www.googleapis.com/auth/userinfo.profile';
var dataSheetID = "1K0Yurjb9R2Hpq0QG01-1Y-N-Y3myK8lfJ7aVZD9ZZFg";
var sheetIds = [345465162, 1288027469, 314131839]; // plasmids, aliquots, boxsizes

$(function () {
  var History = window.History;
  History.Adapter.bind(window,'statechange',function(){
    var State = History.getState();
    History.log(State.data, State.title, State.url);
    gQuery = State.data.query;
    if (gQuery) {
      $('#box-name-input').val(gQuery);
    } else {
      $('#box-name-input').val("");
    }
    doQuery(gQuery);
  });

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
    closeForm();
    updatePlasmid(newdata);
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
  });
});

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
  //var plasmid = gData[name];
  var plasmid = gPlasmids.find(el => el[0] === name);

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
  // gData = jQuery.extend({}, data.data);

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
      var $cell = $table.find('tr').eq(line[1]).find('td').eq(line[2]);
      fillInfo($cell, line[3]);
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
  var noteStr = "" + data[7];
  var resStr = "" + data[4];
  var altStr = "" + data[1];
  var vecStr = "" + data[2];
  var insStr = "" + data[3];
  var $div = $('<div>');
  $cell.html("<div class='main'> <div class='note'>" + $div.text(noteStr).html() + "</div>" +
    "<div class = 'info'> <span class='name'>" + $div.text(data[0]).html() + "</span> <br>" +
    "<tt>R:</tt> " + $div.text(resStr).html() + "<br>" +
    "<tt>A:</tt> " + $div.text(altStr).html() + "<br>" +
    "<tt>V:</tt> " + $div.text(vecStr).html() + "<br>" +
    "<tt>I:</tt> " + $div.text(insStr).html() + "<br> </div>" +
    "<div class='aliquots-block'>" + aliquotsStr.join('') + "</div></div>");
}

function showQueryResults(data) {
  // gData = {};
  // for (var i in data) {
  //   gData[data[i][0]] = data[i];
  // }
  var $table = $('#query-result-table');

  $('#box-name-input').prop('disabled', false);
  $('body').css('cursor', 'default');

  $table.show();

  if (!data || data.length === 0) {
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

function readForm() {
  var $form = $('#plasmid-form');
  var plasmidName = $form.find("#plasmid-name").text();
  var oldData = gPlasmids.find(el => el[0]===plasmidName);
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
  //var data = gData[plasmidName];
  var data = gPlasmids.find(el => el[0] === plasmidName);
  var $form = $('#plasmid-form');
  $form.find('#alt-name').val(data[1]);
  $form.find('#vector').val(data[2]);
  $form.find('#insert').val(data[3]);
  $form.find('#note').val(data[7]);
  $form.find('#seq').val(data[8]);
  $form.find('#tag').val(data[5]);

  $form.find("[type=checkbox]").prop("checked", false);
  if (data[4] !== undefined) {
    var rsts = data[4].split(',');
  } else {
    var rsts = [];
  }
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

function getCurrentDate() {
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

function handleClientLoad() {
  gapi.load('client:auth2', function() {
    gapi.client.init({
      'apiKey': APIKey,
      'clientId': clientID,
      'scope': APIScopes,
      'discoveryDocs': ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    }).then(function() {
      gapi.auth2.getAuthInstance().isSignedIn.listen(updateSignInStatus);
      gapi.auth2.getAuthInstance().signIn();
      updateSignInStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    });
  });
}

function updateSignInStatus(isSignedIn) {
  if (isSignedIn) {
    readDataSheets();
  }
}

function readDataSheets() {
  Promise.all([
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: dataSheetID,
      range: 'boxsizes!2:9999',
    }),

    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: dataSheetID,
      range: 'aliquots!2:99999',
    }),

    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: dataSheetID,
      range: 'plasmid!2:99999',
    }),
  ]).then(function(resp) {
    gBoxSizes = resp[0].result.values;
    gAliquots = resp[1].result.values;
    gPlasmids = resp[2].result.values;

    var pars = location.search.replace('?', '').split('&').map(function(val){
      return val.split('=');
    });
    if (pars[0][0] == 'query') {
      var q = pars[0][1].trim();
      if ( q && q.length >=3 ) {
        History.replaceState({query: q}, q, '?query=' + q);
        gQuery = q;
        $('#box-name-input').val(gQuery);
        doQuery(q);
      }
    }
  }, function(reason) {
      alert('Error reading data ' + reason.result.error.message);
  });
}

function doQuery(q) {
  $('#box-content-table').empty().hide();
  $('#query-result-table').empty().hide();

  if (q) {
    $('#box-name-input').prop('disabled', true);
    $('body').css('cursor', 'wait');

    if (q.match(/[\dcC]-\w?\d-\d/)) {
      $('#box-content').data('name', q);
      getContents(q);
    } else {
      $('#query-result-table').data('query', q);
      getPlasmids(q);
    }
  }
}

function getContents(boxName) {
  var nRow = 10;
  var nCol = 10;
  boxName = boxName.toUpperCase();
  var match = gBoxSizes.find(el => el[0] == boxName);
  if (match !== undefined) {
    nRows = match[1];
    nCols = match[2];
  }
  var locations = gAliquots.filter(el => el[0] == boxName);
  showContents({locations: locations, size: [nRow, nCol]});
}

function stringInclude(str1, str2) {
  if (str1 === undefined) {
    return false;
  }
  return str1.toUpperCase().includes(str2);
}

function getPlasmids(plasmidName) {
  plasmidName = plasmidName.toUpperCase();
  var matched = gPlasmids.filter(el =>
    stringInclude(el[0], plasmidName) || stringInclude(el[1], plasmidName || stringInclude(el[3], plasmidName))
  );

  for (el of matched) {
    var aliquots = gAliquots.filter(x => x[3] == el[0]);
    var allNames = [];
    for (al of aliquots) {
      var aliquotName = al[0] + ":" + al[1] + String.fromCharCode(64 + Number(al[2]));
      allNames.push(aliquotName)
    }
    el[9] = allNames;
  }

  //console.log(matched);
  showQueryResults(matched);
}

function _removeAliquot(boxName, row, col, contentName, $cell) {
  row = Number(row);
  col = Number(col);
  boxName = boxName.toUpperCase();
  idx = gAliquots.findIndex(el => el[0] === boxName && el[1] === row && el[2] === col);
  console.log(idx)

  if (idx !== -1) {
    var request = [];
    request.push({
      deleteDimension: {
        range: {
          sheetId: sheetIds[1],
          dimension: "ROWS",
          startIndex: idx + 1,
          endIndex: idx + 2,
        }
      }
    });
    gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: dataSheetIds,
      resource: request,
    }).then( (resp) => {
      removeAliquot(resp, $cell)
    });
  } else {
    alert('Aliquot does not exisit in the database');
  }
}

function _addAliquot(boxName, row, col, contentName, $cell) {
  row = Number(row);
  col = Number(col);
  boxName = boxName.toUpperCase();

  //read current aliquot table in case sth has changed
  // gapi.client.sheets.spreadsheets.values.get({
  //   spreadsheetId: dataSheetID,
  //   range: 'aliquots!2:99999',
  // }).then( (resp) => {
  //   var curAliqots = resp.result.values;
  //
  // });
  var params = {
    spreadsheetId: dataSheetID,
    range: 'aliquots!A:G',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
  };
  var data = {
    values: [
      [boxName, row, col, contentName, '', getCurrentDate()],
    ]
  };
  var request = gapi.client.sheets.spreadsheets.value.append(params, data);
  request.then( (resp) => {
    readDataSheets();
  }, (reason) => {
    onFailure(reason.result.error);
  });
}

function updatePlasmid(plasmidData) {
  if (plasmidData[6] === undefined || plasmidData[6].length == 0) {
    plasmidData[6] = userName;
  }
  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: dataSheetID,
    range: 'plasmid!2:99999',
  }).then( (resp) => {
    var plasmids = resp.result.values;
    var idx = plasmids.findIndex( el => el[0] === plasmidData[0]);
    if (idx === -1) {
      idx = plasmids.length;
    }
    idx = idx + 2;
    var range = 'plasmid!' + idx + ":" + idx;
    console.log(range);
    var params = {
      spreadsheetId: dataSheetID,
      range: range,
      valueInputOption: 'RAW',
    };
    var data = {
      values: [plasmidData],
    };
    var request = gapi.client.sheets.spreadsheets.values.update(params, data);
    request.then((resp) => {
      readDataSheets();
    }, (reason) => {
      onFailure(reason.result.error);
    });
  }, (reason) => {
    onFailure(reason.result.error);
  });
}
