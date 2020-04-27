export default () =>  {

  const dropDownOptions = document.getElementById('dropDownOptions');
  const type = document.getElementsByName('type');

  function changeHandler() {
    if (this.value === 'group') {
      dropDownOptions.style.display = 'block'
    } else {
      dropDownOptions.style.display = 'none' 
    }
  }
  
  Array.prototype.forEach.call(type, function(type) {
    type.addEventListener('change', changeHandler);
  });


  const addOption = document.getElementById("add-option");
  const dropdownOption = document.getElementsByClassName("drop-down-option");

  addOption.onclick = function(e) { return myHandler(e); };

  function myHandler() {

    var option = document.createElement('input');
    option.setAttribute('name', 'config[options][]');
    option.setAttribute('type', 'text');
    option.classList.add('govuk-input');
    option.classList.add('drop-down-option');

    var deleteLink = document.createElement('a');
    deleteLink.setAttribute('href', '#');
    deleteLink.innerHTML = 'Delete';
    deleteLink.classList.add('govuk-link');
    deleteLink.classList.add('delete-option');

    var disableLink = document.createElement('a');
    disableLink.setAttribute('href', '#');
    disableLink.innerHTML = 'Disable';
    disableLink.classList.add('govuk-link');
    disableLink.classList.add('disable-option');

    deleteLink.addEventListener('click', deleteHander);
    disableLink.addEventListener('click', disableHander);

    dropdownOption[0].parentNode.insertBefore(option, dropdownOption[0].nextSibling);
    dropdownOption[0].parentNode.insertBefore(disableLink, dropdownOption[0].nextSibling);
    dropdownOption[0].parentNode.insertBefore(deleteLink, dropdownOption[0].nextSibling);

    return false;
  }

  const deleteOption = document.getElementsByClassName('delete-option');

  function deleteHander() {

    if (this.nextElementSibling.nextElementSibling.nodeName != 'INPUT' && 
    this.previousElementSibling.previousElementSibling.nodeName != 'A') {
      return false;
    }

    this.previousElementSibling.remove();
    this.nextElementSibling.remove();
    this.remove();
    return false;
  }
  
  
  Array.prototype.forEach.call(deleteOption, function(deleteOption) {
    deleteOption.addEventListener('click', deleteHander);
  });

  const disableOption = document.getElementsByClassName('disable-option');

  function disableHander() {

    if (this.nextElementSibling.nodeName != 'INPUT' && 
    this.previousElementSibling.previousElementSibling.previousElementSibling.nodeName != 'A') {
      return false;
    }

    if (this.innerHTML == 'Disable') {
      this.innerHTML = 'Enable';
      this.previousElementSibling.previousElementSibling.disabled = true;
    } else {
      this.innerHTML = 'Disable';
      this.previousElementSibling.previousElementSibling.disabled = false;
    }
  }
  
  Array.prototype.forEach.call(disableOption, function(disableOption) {
    disableOption.addEventListener('click', disableHander);
  });

}