export default () =>  {

  function getPreviousSibling(n) {
    let prev = n.previousSibling;
    while (prev.nodeType != 1) {
      prev = prev.previousSibling;
    }
    prev.firstElementChild.children[0].value++;
    return prev;
  } 
    
  function getSibling(n) {
    let next = n.nextSibling;
    while (next != null && next.nodeType != 1) {
      next = next.nextSibling;
    }
    return next;
  }

  [...document.querySelectorAll('.move-up')].forEach(function(moveUpBtn) {
    moveUpBtn.addEventListener('click', function() {
      let table = moveUpBtn.parentNode.parentNode.parentNode.parentNode;
      let row = moveUpBtn.parentNode.parentNode;

      while (row != null) {
        if (row.nodeName == 'TR') {
          break;
        }
        row = row.parentNode;
      }

      if (row == table.rows[1]) {
        return false;
      }

      table = row.parentNode;
      row.firstElementChild.children[0].value--;
      table.insertBefore(row, getPreviousSibling(row));
    });
  });

  [...document.querySelectorAll('.move-down')].forEach(function(moveDownBtn) {
    moveDownBtn.addEventListener('click', function() {
      let table = moveDownBtn.parentNode.parentNode.parentNode.parentNode;
      let row = moveDownBtn.parentNode.parentNode;

      while (row != null) {
        if (row.nodeName == 'TR') {
          break;
        }
        row = row.parentNode;
      }
      table = row.parentNode;

      if (row == table.rows[table.rows.length-1]) {
        return false;
      }

      row.firstElementChild.children[0].value++;
      const prevSib = getSibling(row);
      prevSib.firstElementChild.children[0].value--;
      table.insertBefore(row, getSibling(prevSib));
    });
  });

//   document.getElementById('reorder-fields').addEventListener("click", function(){
//     document.querySelectorAll('.reorder-row').style.display = 'block';
//   });

}