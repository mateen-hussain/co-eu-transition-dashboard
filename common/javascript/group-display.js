export default () =>  {

  // Toggle dropdown
  const dropDownOptions = document.getElementById('dropDownOptions');
  function changeHandler() {
    if (this.value === 'group') {
      dropDownOptions.style.display = 'block'
    } else {
      dropDownOptions.style.display = 'none' 
    }
  }
  
  const type = document.getElementsByName('type');
  Array.prototype.forEach.call(type, function(type) {
    type.addEventListener('change', changeHandler);
  });

  // Add button
  const addOption = document.getElementById("add-option");
  addOption.onclick = function(e) { return myHandler(e); };

  function myHandler() {
    const dropdownOption = document.getElementsByClassName("drop-down-option");

    const option = document.createElement('input');
    option.setAttribute('name', 'config[options][]');
    option.setAttribute('type', 'text');
    option.classList.add('govuk-input');
    option.classList.add('drop-down-option');

    const deleteLink = document.createElement('a');
    deleteLink.setAttribute('href', '#/');
    deleteLink.innerHTML = 'Delete';
    deleteLink.classList.add('govuk-link');
    deleteLink.classList.add('delete-option');

    const disableLink = document.createElement('a');
    disableLink.setAttribute('href', '#/');
    disableLink.innerHTML = 'Disable';
    disableLink.classList.add('govuk-link');
    disableLink.classList.add('disable-option');
    
    deleteLink.addEventListener('click', deleteHander);
    disableLink.addEventListener('click', disableHander);

    dropdownOption[0].parentNode.insertBefore(option, dropdownOption[dropdownOption.length - 1].nextSibling);
    dropdownOption[0].parentNode.insertBefore(deleteLink, dropdownOption[dropdownOption.length - 1]);
    dropdownOption[0].parentNode.insertBefore(disableLink, dropdownOption[dropdownOption.length - 1]);

    return false;
  }

  // Delete button
  function deleteHander() {
    if (this.nextElementSibling.nextElementSibling.nodeName != 'INPUT' && 
    this.previousElementSibling.previousElementSibling.nodeName != 'A') {
      return false;
    }
    this.previousElementSibling.remove();
    this.nextElementSibling.remove();
    this.remove();
  }
  
  const deleteOption = document.getElementsByClassName('delete-option');
  Array.prototype.forEach.call(deleteOption, function(deleteOption) {
    deleteOption.addEventListener('click', deleteHander);
  });

  // Disable button
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

  const disableOption = document.getElementsByClassName('disable-option');
  Array.prototype.forEach.call(disableOption, function(disableOption) {
    disableOption.addEventListener('click', disableHander);
  });

}