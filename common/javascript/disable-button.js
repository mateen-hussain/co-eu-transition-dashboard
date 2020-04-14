var radio = document.querySelector('input[type=radio][name="sign-off"]');
var continueBtn = document.getElementsByClassName('continueBtn');

if (radio.value === 'yes') {
  continueBtn[0].removeAttribute('disabled')
}