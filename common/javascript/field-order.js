export default () =>  {

  function get_previoussibling(n){
    let x = n.previousSibling;
    while (x.nodeType != 1){
      x = x.previousSibling;
    }
    return x;
  } 
    
  function get_nextsibling(n) {
    let x = n.nextSibling;
    while (x != null && x.nodeType != 1) {
      x = x.nextSibling;
    }
    return x;
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
      table = row.parentNode;
      table.insertBefore(row, get_previoussibling(row));
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
      table.insertBefore (row, get_nextsibling(get_nextsibling(row)));
    });
  });

//   document.getElementById('reorder-fields').addEventListener("click", function(){
//     document.querySelectorAll('.reorder-row').style.display = 'block';
//   });

}