const webcamElement = document.querySelector("#webcam");
const canvasElement = document.querySelector("#canvas");
const yesOrNo = document.querySelector(".yesOrNo");
const smileTotalNumber = document.querySelector(".smile_total_number");
const smileTodayProgress = document.querySelector(".smile_today_progress");
const smileTodayNumber = document.querySelector(".smile_today_number");
const result = document.querySelector(".result");
const snap = document.querySelector("#snap");


let average = 14;
let smile_today = 3;
let smile_total = 15;
let picture;

console.log(webcamElement);
console.log(canvasElement);
const webcam = new Webcam(
  webcamElement,
  "user",
  canvasElement, null
);
webcam
  .start()
  .then((result) => {
    console.log("webcam started");
  })
  .catch((err) => {
    console.log(err);
  });
snap.addEventListener('click', () => {
  console.log("clicked");
  picture = webcam.snap();
  sendPost();
});

function tag () {
  let interval = 1;
  let updatesPerSecond = 1000 / 60;
  let end = smile_today;
  console.log(end);

  function animator () {
    smileTodayProgress.value = smileTodayProgress.value + interval;
    if ( smileTodayProgress.value + interval < end){
      setTimeout(animator, updatesPerSecond);
    } else { 
      smileTodayProgress.value = end
    }
  }

  

  setTimeout(() => {
    animator()
  }, updatesPerSecond)
}

function sendPost() {
  var form = document.createElement('form');
  form.setAttribute('method', 'post');
  form.setAttribute('action', "/result");
  document.charset = "utf-8";
  
  var hiddenField = document.createElement('input');
  hiddenField.setAttribute('type', 'hidden');
  hiddenField.setAttribute('name', "img");
  hiddenField.setAttribute('value', picture);
  form.appendChild(hiddenField);
  document.body.appendChild(form);
  form.submit();
}

