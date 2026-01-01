function OnButtonClick()
{
  console.log("Button clicked!");
}
document.addEventListener("DOMContentLoaded", function () {
  const enableButton = document.getElementById("enableButton");
  enableButton.addEventListener("click", OnButtonClick);
});
