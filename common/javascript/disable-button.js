export default () =>  {

  const continueBtn = document.getElementsByClassName('continueBtn');
  const radio = document.getElementsByName('sign-off');

  function changeHandler() {
    if (this.value === 'yes' ) {
      continueBtn[0].classList.remove('govuk-button--disabled')
    } else {
      continueBtn[0].classList.add('govuk-button--disabled')
    }
  }

  Array.prototype.forEach.call(radio, function(radio) {
    radio.addEventListener('change', changeHandler);
  });

}