export default () =>  {

  let seeMore = document.getElementsByClassName('see-more');

  function changeHandler() {
    let information = this.parentNode.nextElementSibling;

    if (this.innerHTML == 'See more') {
      information.style.display = 'block';
      this.innerHTML = 'See less';
    } else if (this.innerHTML == 'See less') {
      information.style.display = 'none';
      this.innerHTML = 'See more';
    }

    return false;
  }
  
  Array.prototype.forEach.call(seeMore, function(seeMore) {
    seeMore.addEventListener('click', changeHandler);
  });
  
}