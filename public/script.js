'use strict';

class MediaItem extends HTMLElement {
    constructor() {
        super();
        let template = document.getElementById('media-item');
        let templateContent = template.content;
        this.attachShadow({mode: 'open'}).appendChild(templateContent.cloneNode(true));
    }

    async setMedia(apod) {
        this.shadowRoot.getElementById('title').textContent = apod.title;

        const dateNode = this.shadowRoot.getElementById('date');
        dateNode.setAttribute("dateTime", apod.date);
        var parts =apod.date.split('-');
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        dateNode.textContent = date.toLocaleDateString('en-US', options);

        const descriptionNode = this.shadowRoot.getElementById('description-text');
        descriptionNode.textContent = this.getSnippet(apod.explanation) + '...';
        this.shadowRoot.getElementById('more-btn').addEventListener('click', (e) => {
            descriptionNode.textContent = apod.explanation;
            e.currentTarget.style.display = 'none';
        });

        const contentNode = this.shadowRoot.getElementById('content');

        if(apod.copyright) {
            const div = document.createElement('div');
            div.id = 'copyright-holder';
            div.textContent = 'Copyright holder: ' +  apod.copyright;
            contentNode.appendChild(div);
        }

        let elem = await this.createMediaElement(apod.hdurl || apod.url, apod.media_type);
        if(!elem) {
            return;
        }
        if(elem.nodeName === 'IFRAME') {
            const div = document.createElement('div');
            div.id = 'iframe-container';
            div.appendChild(elem);
            elem = div;
        }

        if(elem.nodeName === 'IMG') {
            this.style.width = elem.width + 'px';
        }


        this.shadowRoot.insertBefore(elem, contentNode);
    }

    async createMediaElement(url, type) {
        return new Promise((resolve, reject) => {
            let elem;
            if(type === 'image') {
                elem = document.createElement('img');
                elem.addEventListener('load', () => {
                    resolve(elem);
                });
                setTimeout(() => {reject("Took too long")}, 12000);
            } else if(type === 'video') {
                elem = document.createElement('iframe');
                resolve(elem);
            } else {
                resolve();
            }
            elem.src = url;            
        });
    }

    getSnippet(text) {
        const maxSnippedLen = 200;
        const minSnippetLen = 100;
        let snippet = text.substr(0, maxSnippedLen);

        let i = maxSnippedLen;
        while(snippet[i] !== ' ' && i !== minSnippetLen) {
            --i;
        }

        return snippet.substr(0, i);
    }
}

customElements.define('media-item', MediaItem);

const apods = [];

async function getRandomApod() {
    //const response = await fetch('https://api.nasa.gov/planetary/apod?api_key=yxi0nUUOlqUR4P5GLIWK7cbGAGWmO8uZR6dIMoK7' + '&date=' + getRandomDayInRange());
    if(apods.length < 8) {
        if(apods.length === 0) {
            const response = await fetchApods();
            apods.push(...(await response.json()));
        } else {
            fetchApods()
                .then(async (response) => {
                    apods.push(...(await response.json()));
                });
        }
    }
    return apods.pop();
}

async function fetchApods() {
    return await fetch('https://api.nasa.gov/planetary/apod?api_key=yxi0nUUOlqUR4P5GLIWK7cbGAGWmO8uZR6dIMoK7' + '&count=' + 16);
}

/*
function getRandomDayInRange() {
    // APOD starts at 1995-06-16
    const start = 803264401000;
    const end = Date.now();
    const date = new Date(Math.floor((end - start) * Math.random() + start));
    return date.toISOString().substr(0, 10);
}
*/

let lastMediaItem = null;
let numLoading = 0;
const maxLoad = 8;
const mediaItems = [];


const container = document.getElementById('container');


async function append() {
    if(isFilled(lastMediaItem)) {
        return;
    }
    if(numLoading === maxLoad) {
        console.warn('max loading');
        setTimeout(append, 4000);
        return;
    }
    let mediaItem;
    try {
        ++numLoading;
        //const apod = await getRandomApod();
        const apod = {
            date: "2017-07-04",
            explanation: "What if you could go right into a cluster where stars are forming? A one-minute, time-lapse, video visualization of just this has been made with 3D computer modeling of the region surrounding the star cluster Westerlund 2, based on images from the Hubble Space Telescope in visible and infrared light. Westerlund 2 spans about 10 light years across and lies about 20,000 light years distant toward the constellation of the Ship's Keel (Carina). As the illustrative animation begins, the greater Gum 29 nebula fills the screen, with the young cluster of bright stars visible in the center.  Stars zip past you as you approach the cluster. Soon your imaginary ship pivots and you pass over light-year long pillars of interstellar gas and dust.  Strong winds and radiation from massive young stars destroy all but the densest nearby dust clumps, leaving these pillars in their shadows -- many pointing back toward the cluster center. Last, you pass into the top of the star cluster and survey hundreds of the most massive stars known.    Open Science: Browse 1,500+ codes in the Astrophysics Source Code Library",
            media_type: "video",
            service_version: "v1",
            title: "Celestial Fireworks: Into Star Cluster Westerlund 2",
            url: "https://www.youtube.com/embed/dtY44sPNHcU?rel=0"
        };
        //console.log(apod);
        if(apod.url && apod.url.substr(0, 2) === '//') {
            apod.url = 'https://' + apod.url;
        }
        if(apod.hdurl && apod.hdurl.substr(0, 2) === '//') {
            apod.hdurl = 'https://' + apod.hdurl;
        }
        mediaItem = document.createElement('media-item');
        await mediaItem.setMedia(apod);
    } finally {
        --numLoading;
    }
    //const div = document.createElement('div');
    //div.classList.add('hybrid-width');
    //div.appendChild(mediaItem);


    //document.body.appendChild(div);
    container.appendChild(mediaItem);


    mediaItems.push(mediaItem);
    let removeMediaItems = [];
    if(mediaItems.length > 24) {
        removeMediaItems = mediaItems.splice(0, 8);
    }
    for(let elem of removeMediaItems) {
        elem.remove();
    }

    lastMediaItem = mediaItem;
    append();
}

function isFilled(lastMediaItem) {
    if(lastMediaItem && (lastMediaItem.getBoundingClientRect().bottom) > window.innerHeight * 3) {
        return true;
    }
    return false;
}

document.addEventListener('scroll', append);
append();