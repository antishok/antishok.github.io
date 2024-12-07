var maxItems = 100;
var refreshTime = 60000;
var timer;

const title = 'ynet alerts';

fetchAlerts();

function fetchAlerts() {
  //const alertsUrl = 'https://corsproxy.io/?' + encodeURIComponent(`https://www.ynet.co.il/iphone/json/api/auto_ticker/BJxBgE80q2?cb=${Math.random()}`);
  const alertsUrl = 'https://oraclevm.antishok.xyz/iphone/json/api/auto_ticker/BJxBgE80q2?cb=0.3611810182108661=';
  $.get(alertsUrl).then(processAlerts);
}

function processAlerts(data) {
  data = data.data.tickerAutoDesktop.data;
  document.title = title;

  //console.log('data:', data);

  const curItems = data.map(item => {
    const message = item.title;
    const timestamp = Date.parse(item.launchDate);
    const fulltext = item.plainText;
    const d = new Date(timestamp);
    const date = `${d.getDate()}/${d.getMonth()+1}/${1900+d.getYear()} ${String(d.getHours()).padStart(2,0)}:${String(d.getMinutes()).padStart(2,0)}`;
    const url = item.publishedLink;

    return {
      date, timestamp, message, fulltext, url
    }
  });

  // const curItems = Array.from(div.children[0].children).map((item) => {
  //   const url = item.childNodes[4].textContent.trim();
  //   const message = item.children[2].innerHTML.replace('<!--[CDATA[','').replace(']]-->','').replace('&percent;','%');
  //   const date = item.children[0].innerText.trim();
  //   const sp = date.split(' ')[0].split('/');
  //   const timestamp = Date.parse(sp[1] + '/' + sp[0] + date.slice(5));

  //   return {
  //     date: date,
  //     timestamp: timestamp,
  //     url: url,
  //     message: message
  //   };
  // });

  //div.innerHTML = '';

/*  jquery version of above:  (testing memory leaks..)

  var curItems = $(data).find('item').get().map(function(item) {
    var el = $(item);
    var url = el.contents().eq(4).text().trim();
    var message = el.children('message').html().replace('<!--[CDATA[','').replace(']]-->','');
    message = message.replace('&percent;','%');
    var date = el.find('date').text().trim();
    var sp = date.split(' ')[0].split('/');
    var timestamp = Date.parse(sp[1] + '/' + sp[0] + date.slice(5));

    return {
      date: date,
      timestamp: timestamp,
      url: url,
      message: message
    };
  });
*/

  var items = curItems;
  var prevItems = localStorage["alertItems"] && JSON.parse(localStorage["alertItems"]);
  var prevNumNew = Number(localStorage["numNew"]) || 0;
  var numNew = items.length;
  var newItems = [];

  if (prevItems) {
    // remove duplicates, combine prev & current items, sort
    newItems = curItems.filter(function(item) {
      return prevItems.filter(function(prevItem) {
        var same = (item.timestamp === prevItem.timestamp) &&
        		     levenshtein_distance(item.message, prevItem.message) < 20;
        if (same)
        	prevItem.message = item.message;
        return same;
      }).length === 0;
    });
    numNew = newItems.length + prevNumNew;

    var allItems = newItems.concat(prevItems);
    allItems = allItems.slice().sort(function(a,b) {
      return (b.timestamp === a.timestamp)
        ? allItems.indexOf(a) - allItems.indexOf(b) // make sure sort is stable
        : b.timestamp - a.timestamp
    });

    items = allItems.slice(0, maxItems);
  }

  if (numNew > 0) {
    document.title += ' (' + numNew + ')';
    //setTimeout(()=>{ document.title += ' *' }, 0);
  }

  localStorage["numNew"] = numNew;
  localStorage["alertItems"] = JSON.stringify(items);

  var $items = items.map(function(item, i) {
    var $item = document.createElement('item');
    var $date = document.createElement('date');
    $date.innerText = item.date;
    $item.appendChild($date);
    var $a = document.createElement('a');

    $a.setAttribute('href',item.url);
    $a.setAttribute('data-text',item.fulltext);
    $a.innerText = item.message || '-';
    if (i < numNew) { $a.className = 'new'; }
    $item.appendChild($a);
    return $item;
  });


  //$(tickerItems).html( $items );  // leaks memory..

  document.body.innerText = '';
  const tickerItems = document.createElement('tickeritems');
  document.body.appendChild(tickerItems);
  $items.forEach((item) => tickerItems.appendChild(item));

  setTimer();
}


$(document).on('click', 'a', function(e) {
  if (e.which !== 1) return;

  e.preventDefault();

  var link = $(this);
  if (link.next('text').length)
    return;

  link.after('<text>...</text>');
  const text = link.data('text').trim();
  //console.log('zz',text,link)
  link.next('text').text(text);

  // $.get('https://www.ynet.co.il' + link.attr('href')).done(function(data) {
  //   var text = $($.parseHTML(data)).find('.text12').text().replace('(ynet)','').trim();
  //   link.next('text').text(text);
  // }).error(function(a,b,c) { console.log('xhr error', b,c) })
});


window.onfocus = function() {
	document.title = 'ynet alerts';
	localStorage["numNew"] = 0;
	setTimer();
}

window.onclick = setTimer;

function setTimer() {
	if (timer)
		clearTimeout(timer);
	//timer = setTimeout(location.reload.bind(location), refreshTime);
  timer = setTimeout(fetchAlerts, refreshTime);
}



function levenshtein_distance(str1, str2) {
  if (str1 === str2) return 0;
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;

  // two rows
  var prevRow  = new Array(str2.length + 1),
      curCol, nextCol, i, j, tmp;

  // initialise previous row
  for (i=0; i<prevRow.length; ++i) {
    prevRow[i] = i;
  }

  // calculate current row distance from previous row
  for (i=0; i<str1.length; ++i) {
    nextCol = i + 1;

    for (j=0; j<str2.length; ++j) {
      curCol = nextCol;

      // substution
      nextCol = prevRow[j] + ( (str1.charAt(i) === str2.charAt(j)) ? 0 : 1 );
      // insertion
      tmp = curCol + 1;
      if (nextCol > tmp) {
        nextCol = tmp;
      }
      // deletion
      tmp = prevRow[j + 1] + 1;
      if (nextCol > tmp) {
        nextCol = tmp;
      }
      prevRow[j] = curCol;
    }
    prevRow[j] = nextCol;
  }

  return nextCol;
}
