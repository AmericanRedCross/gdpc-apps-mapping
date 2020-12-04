/* GLOBAL VARIABLES */
var world, appDirectory, geojson;

var map = L.map('map').setView([0, 0], 2);
map.fitBounds([
	[-50, 130],
	[60, -110]
]);

/* GRAB APP DIRECTORY DATA */
function fetchAppDirectory(){
  return new Promise(function(resolve, reject){
    Papa.parse('https://americanredcross.github.io/google-sheets-workaround/gdpc-apps-mapping.csv', {
      download: true,
      header: true,
      complete: function(results){
        resolve(results.data);
      }
    })
  })
}
        
window.addEventListener('DOMContentLoaded', function(){
  /* PROMISES I GUESS? */
  Promise.all([
			d3.json("./data/ne_50m-simple-topo.json"), 
	    fetchAppDirectory()
		]).then(function(values){
      formatData(values);
  });
})

/* GET OUR FETCHED DATA READY TO USE */
function formatData(dataArray){
	/* SAVE OUR FETCHED DATA TO OUR GLOBAL VARIABLES */
	world = topojson.feature(dataArray[0], dataArray[0].objects.world);
	appDirectory = dataArray[1];
	/* LOOP THROUGH AND DO ANY DATA CLEANING ETC ON OUR APP DIRECTORY DATA */
	for(var i = 0; i < appDirectory.length; i++){
		/* TURN OUR SPACE DELIMITED ISO CODES INTO AN ARRAY */
		/* REDUCE MULTIPLE SPACES TO ONE, TRIM WHITESPACE FROM ENDS, AND THEN SPLIT ON SPACE */
    if(!! appDirectory[i]['countries']){
		   appDirectory[i]['countries'] = appDirectory[i]['countries'].replace(/\s\s+/g, ' ').trim().split(" ");
    } else {
      appDirectory[i]['countries'] = []
    }
	}

  for(var i = 0; i < world.features.length; i++){
    var thisIso = world.features[i].properties.iso;
    world.features[i].properties.app_count = 0;
    for(var j = 0; j < appDirectory.length; j++){ 
      if($.inArray(thisIso, appDirectory[j].countries) != -1){
        world.features[i].properties.app_count ++;
      }
      if($.inArray("global", appDirectory[j].countries) != -1){
        world.features[i].properties.app_count ++;
      }
    }
  }
  
	mapIt();
}

function mapIt(){

  var info = L.control();
  info.onAdd = function(map){
      this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
      this.update();
      return this._div;
  };
  // method that we will use to update the control based on feature properties passed
  info.update = function(props){
      this._div.innerHTML = props ? '<div>' + props.name + ' - ' + props.app_count + ' apps</div>' : '';
  };
  info.addTo(map);
  
  function highlightFeature(e){
    var layer = e.target;
    layer.setStyle({
      weight: 4,
      color: '#666',
      dashArray: '',
    });
    if(!L.Browser.ie && !L.Browser.opera && !L.Browser.edge){
      layer.bringToFront();
    }
    info.update(layer.feature.properties);  
  }
  
  function resetHighlight(e){
    geojson.resetStyle(e.target);
    info.update()
  }
  
  function geoClick(e){
    $('#apps-info').empty();
    var thisIso = e.target.feature.properties.iso;
    $('.modal-title').html(e.target.feature.properties.name + " - " + e.target.feature.properties.app_count + " apps") 
    d3.select('#apps-info').selectAll('div')
      .data(appDirectory)
      .enter().filter(function(d){
        return $.inArray(thisIso, d.countries) != -1 || $.inArray('global', d.countries) != -1
      })
      .append('div')
      .html(function(d){
        var myHtml = 
          '<div class="media mb-4">' +
            '<img class="app-img mr-3" src="./img/'+ ((!!d.logo) ? d.logo : "noun_App_3166100.png") + '" alt="app image">' +
            '<div class="media-body">' +
              "<h5 class='app-title'>" + d.app_name + "</h5>" + 
              "<div class='app-description mb-2'>" + 
                d.description +
                " <small class='app-category text-muted'>[" + d.category +  " | developed by: " + d.app_developer + "]</small>" +
              "</div>" +
              "<div class='app-links'>" + // links to download
                ((d.link_apple || d.link_google) ? "Get it on " : "") +
                ((!!d.link_google) ? '<a href=' + d.link_google + ' target="_blank">Google Play Store <i class="app-link-icon fab fa-google-play"></i></a>' : '') +
                ((d.link_apple && d.link_google) ? " or " : '' )+
                ((!!d.link_apple) ? '<a href=' + d.link_apple + ' target="_blank">Apple App Store <i class="app-link-icon fab fa-app-store-ios"></i></a>' : '') +
              "</div>" + 
            '</div>' + //.media-body 
          '</div>'  // .media
        return myHtml;
      })
    $('#modal').modal()
  }
  
  function onEachFeature(feature, layer){
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: geoClick
    });
  }
  
  // var min = d3.min(world.features, function(d){ return d.properties.app_count; });
  // var max = d3.max(world.features, function(d){ return d.properties.app_count; });
  // var getColor = d3.scaleQuantize()
  //         .range(["#fc9272","#ef3b2c","#a50f15"]) // reds
  //         .domain([min, max])
  function getColor(d){
    return d >= 10   ? '#67000d' :
           d >= 5    ? '#cb181d' :
           d >= 3    ? '#fb6a4a' :
           d >= 1    ? '#fcbba1' :
                       '#d9d9d9';
  }
  
  function geoStyle(feature){
    return {
      fillColor: getColor(feature.properties.app_count),
      weight: 2,
      opacity: 1,
      color: 'white',
      fillOpacity: 1
    }
  }
  
  geojson = L.geoJson(world.features, {
    style: geoStyle,
    onEachFeature: onEachFeature
  }).addTo(map);
  
}
