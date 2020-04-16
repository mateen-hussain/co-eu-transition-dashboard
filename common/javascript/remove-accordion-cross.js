// Removes the plus icon from the accordion if the table is empty 
export default () =>  {

  const accordionTable = document.getElementById('accordion-table');
  const milestoneTable = document.getElementsByClassName('table-content');

  let count = 0;

  for (var i = 0; i < milestoneTable.length; i++) {
    if (milestoneTable[i].rows.length == 0) {
      const accordionHeader = milestoneTable[i].parentElement.parentElement.querySelector('.govuk-accordion__section-heading');
      accordionHeader.classList.add('remove-icon')
      count++;
    }
  }
  if (count == milestoneTable.length) {
    accordionTable.classList.add('remove-open-all')
  }

}