const rankingModal = document.querySelector('#modal');
const closeRankingModal = rankingModal?.querySelector('.close');

closeRankingModal?.addEventListener('click', () => rankingModal.close());

rankingModal?.addEventListener('click', (event) => {
  if (event.target === rankingModal) rankingModal.close();
});
