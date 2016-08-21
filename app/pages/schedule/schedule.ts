import { Component, ViewChild } from '@angular/core';

import { AlertController, App, ItemSliding, List, ModalController, NavController } from 'ionic-angular';

import { ConferenceData } from '../../providers/conference-data';
import { ScheduleFilterPage } from '../schedule-filter/schedule-filter';
import { SessionDetailPage } from '../session-detail/session-detail';
import { UserData } from '../../providers/user-data';
import {ConnectivityService} from '../../providers/connectivity-service/connectivity-service';


@Component({
  templateUrl: 'build/pages/schedule/schedule.html',
  providers:[ConnectivityService]
})
export class SchedulePage {
  // the list is a child of the schedule page
  // @ViewChild('scheduleList') gets a reference to the list
  // with the variable #scheduleList, `read: List` tells it to return
  // the List and not a reference to the element
  @ViewChild('scheduleList', {read: List}) scheduleList: List;

  dayIndex = 0;
  queryText = '';
  segment = 'all';
  excludeTracks = [];
  shownSessions = [];
  groups = [];
  mapInitialised: any = false;
  apiKey= "AIzaSyD7BXEn82KJvMu1GaO_hGDIWpOT-N6o4zw";

  constructor(
    public alertCtrl: AlertController,
    public app: App,
    public modalCtrl: ModalController,
    public navCtrl: NavController,
    public confData: ConferenceData,
    public user: UserData,
    private connectivityService: ConnectivityService
  ) {

  }
    ngOnInit() {
    // this.loadMap();
    this.loadGoogleMaps();
  }

    loadGoogleMaps() {

    this.addConnectivityListeners();

    if (typeof google == "undefined" || typeof google.maps == "undefined") {

      console.log("Google maps JavaScript needs to be loaded.");
      this.disableMap();

      if (this.connectivityService.isOnline()) {
        console.log("online, loading map");

        //Load the SDK
        window['mapInit'] = () => {
          this.initMap();
          this.enableMap();
        }

        let script = document.createElement("script");
        script.id = "googleMaps";

        if (this.apiKey) {
          script.src = 'http://maps.googleapis.com/maps/api/js?key=' + this.apiKey + '&callback=mapInit';
        } else {
          script.src = 'http://maps.googleapis.com/maps/api/js?callback=mapInit';
        }

        document.body.appendChild(script);

      }
    }
    else {

      if (this.connectivityService.isOnline()) {
        console.log("showing map");
        this.initMap();
        this.enableMap();
      }
      else {
        console.log("disabling map");
        this.disableMap();
      }
    }
  }


    initMap() {
    this.confData.getTimeline(this.dayIndex, this.queryText, this.excludeTracks, this.segment).then(mapData => {
      this.mapInitialised = true;
      let mapEle = document.getElementById('map');
      console.log(mapData.groups[3].sessions[1].center);
        let latlng = new google.maps.LatLng(18.952209  , -99.497689)
      let map = new google.maps.Map(mapEle, {
            
        center: latlng, 
        zoom: 16
      });
      let marker = new google.maps.Marker({ 
          position: latlng, 
          map: map,
          title: "vasa"
        });

        mapData.groups.forEach(markerData => {
        let infoWindow = new google.maps.InfoWindow({
          content: `<h5>${markerData.sessions.name}</h5>`
          //content: `<h5>jksajksa</h5>`
        });
        console.log(markerData);
        console.log("separador");
        console.log(markerData.sessions[0].lat, markerData.sessions[0].lng);
        
        let latlngg = new google.maps.LatLng(markerData.sessions[0].lat, markerData.sessions[0].lng)
   
        let marker = new google.maps.Marker({ 
          position: latlngg, 
          map: map,
          title: "vasa"
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
      }); 

      google.maps.event.addListenerOnce(map, 'idle', () => {
        mapEle.classList.add('show-map');
      });
    });
  }

  disableMap() {
    console.log("disable map");
  }

  enableMap() {
    console.log("enable map");
  }

  addConnectivityListeners() {
    var me = this;

    var onOnline = () => {
      setTimeout(() => {
        if (typeof google == "undefined" || typeof google.maps == "undefined") {
          this.loadGoogleMaps();
        } else {
          if (!this.mapInitialised) {
            this.initMap();
          }

          this.enableMap();
        }
      }, 2000);
    };

    var onOffline = () => {
      this.disableMap();
    };

    document.addEventListener('online', onOnline, false);
    document.addEventListener('offline', onOffline, false);

  }

  ionViewDidEnter() {
    this.app.setTitle('Schedule');
  }

  ngAfterViewInit() {
    this.updateSchedule();
  }

  updateSchedule() {
    // Close any open sliding items when the schedule updates
    this.scheduleList && this.scheduleList.closeSlidingItems();

    this.confData.getTimeline(this.dayIndex, this.queryText, this.excludeTracks, this.segment).then(data => {
      this.shownSessions = data.shownSessions;
      this.groups = data.groups;
    });
  }

  presentFilter() {
    let modal = this.modalCtrl.create(ScheduleFilterPage, this.excludeTracks);
    modal.present();

    modal.onDidDismiss((data: any[]) => {
      if (data) {
        this.excludeTracks = data;
        this.updateSchedule();
      }
    });

  }

  goToSessionDetail(sessionData) {
    // go to the session detail page
    // and pass in the session data
    this.navCtrl.push(SessionDetailPage, sessionData);
  }

  addFavorite(slidingItem: ItemSliding, sessionData) {

    if (this.user.hasFavorite(sessionData.name)) {
      // woops, they already favorited it! What shall we do!?
      // prompt them to remove it
      this.removeFavorite(slidingItem, sessionData, 'Favorite already added');
    } else {
      // remember this session as a user favorite
      this.user.addFavorite(sessionData.name);

      // create an alert instance
      let alert = this.alertCtrl.create({
        title: 'Favorite Added',
        buttons: [{
          text: 'OK',
          handler: () => {
            // close the sliding item
            slidingItem.close();
          }
        }]
      });
      // now present the alert on top of all other content
      alert.present();
    }

  }

  removeFavorite(slidingItem: ItemSliding, sessionData, title) {
    let alert = this.alertCtrl.create({
      title: title,
      message: 'Would you like to remove this session from your favorites?',
      buttons: [
        {
          text: 'Cancel',
          handler: () => {
            // they clicked the cancel button, do not remove the session
            // close the sliding item and hide the option buttons
            slidingItem.close();
          }
        },
        {
          text: 'Remove',
          handler: () => {
            // they want to remove this session from their favorites
            this.user.removeFavorite(sessionData.name);
            this.updateSchedule();

            // close the sliding item and hide the option buttons
            slidingItem.close();
          }
        }
      ]
    });
    // now present the alert on top of all other content
    alert.present();
  }
}
