

var ical2json = require('ical2json');
const https = require('https');
var dateFormat = require('dateformat');
const moment = require('moment')
var request = require('request'),
    auth = "";

const name = "Hisakiyo";
const tempsAvantTrain = 10; // en minute
const tempsApresTrain = 35; // en minute
const delaiAttente = 15; // delai max à attendre
const delaiLeverDepart = 60; // en minute
const dureeTrajet = 40;
const urlCalendar = "https://edt.univ-littoral.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?data=8241fc38732002143ffcc28a30e8c25ae0fa50826f0818afd07cb68a5f59ac56906f45af276f59aec18424f8595af9f973866adc6bb17503"; // lien vers le fichier iCalendar
const todaysDate = dateFormat(new Date(), "yyyymmdd");
const utcTime = 1 *100; // remplacer le +1 par votre utc
const utc = 1;

console.log("Salut, " + name + " !");
// fetch de la date de début de cours
https.get(urlCalendar, (resp) => {
  let data = '';

  resp.on('data', (chunk) => {
    data += chunk;
  });

  resp.on('end', () => {
    var max = 0;
    var ejson = JSON.parse(JSON.stringify(ical2json.convert(data)));
    for (var i = 0; i < ejson.VCALENDAR[0].VEVENT.length; i++) {
      if(ejson.VCALENDAR[0].VEVENT[i].DTSTART.startsWith(todaysDate)){
        if(max != 0){
          if (max > ejson.VCALENDAR[0].VEVENT[i].DTSTART.slice(9,13)) {
            max = ejson.VCALENDAR[0].VEVENT[i].DTSTART.slice(9,13);
          }
        } else {
          max = ejson.VCALENDAR[0].VEVENT[i].DTSTART.slice(9,13);
        }
      }
    }
    if (!max) {
      console.log("Pas de cours aujourd'hui :)")
    } else {
      // formatage de la date grace à moment.js
      var isoDateTo = moment(( todaysDate.slice(6,8) +"/"+todaysDate.slice(4,6)+"/"+todaysDate.slice(0,4) + " " + max.slice(0,2)+":"+max.slice(2,4) ),'DD/MM/YYYY hh:mm:ss').add(utc,'hour').subtract(tempsApresTrain+dureeTrajet+delaiAttente,'minute').format('YYYYMMDD[T]HHmmss');

      console.log("DEBUG -- à la gare à minimum " + isoDateTo);
      request(
          {
              url : "https://api.navitia.io/v1/coverage/fr-nor/journeys?from=1.60899%3B50.72756&to=1.85046%3B50.95340&max_nb_transfers=1&datetime=" + isoDateTo , // coordonnées from et to
              headers : {
                  "Authorization" : auth
              }
          },
          function (error, response, body) {
            // calcul gare
            var jsontrain = JSON.parse(body);
            var datetrain = (JSON.stringify(jsontrain.journeys[0].departure_date_time)).slice(10,12)+ ":" + (JSON.stringify(jsontrain.journeys[0].departure_date_time)).slice(12,14)+ ":" + (JSON.stringify(jsontrain.journeys[0].departure_date_time)).slice(14,16);
            console.log("Il y a un train a " + datetrain + " qui part de " + JSON.stringify(jsontrain.journeys[0].sections[0].from.name));
            // calcul réveil
            var datereveil = moment(datetrain,'hh-mm-ss').subtract(delaiLeverDepart,'minute').format('hh:mm:ss');
            console.log("On devra donc se réveiller a " + datereveil)
          }
      );
    }

  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});
