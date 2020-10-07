// Sorts table based on value
export default () =>  {

  const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;

  const comparer = (idx, asc) => (a, b) => ((v1, v2) => 
    v2 !== '' && v1 !== '' && !isNaN(v2) && !isNaN(v1) ? v2 - v1 : v2.toString().localeCompare(v1)
  )(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));
    
  document.addEventListener('DOMContentLoaded', function() {
    Array.from(document.getElementsByClassName('sort-coloumn')).forEach(th => th.addEventListener('click', (() => {
      const table = th.closest('table');
      Array.from(table.querySelectorAll('tbody'))
        .sort(comparer(Array.from(th.parentNode.children).indexOf(th), this.asc = !this.asc))
        .forEach(tbody => table.appendChild(tbody));
      th.classList.toggle('down-sort');
    })));
  })
}