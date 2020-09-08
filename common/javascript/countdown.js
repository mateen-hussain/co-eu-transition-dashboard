export default () =>  {

  const second = 1000,
    minute = second * 60,
    hour = minute * 60,
    day = hour * 24;
  
  let countDown = new Date('Jan 01, 2021 00:00:00').getTime();
  
  let now = new Date().getTime()
  let distance = countDown - now;
  document.getElementById('countdown').innerHTML = `${Math.floor(distance / (day))} days`;
  if (distance < 0) {
    document.getElementById('countdown').innerHTML = '0 days'
  }

}