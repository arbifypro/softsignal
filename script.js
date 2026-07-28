document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const keyInput = document.getElementById('access-key');

    // Обробка натискання на кнопку "УВІЙТИ"
    loginBtn.addEventListener('click', () => {
        const key = keyInput.value.trim();

        if (key === '') {
            // Анімація для порожнього поля
            keyInput.style.borderColor = '#EF4444';
            setTimeout(() => {
                keyInput.style.borderColor = '#2e2e48';
            }, 1500);
        } else {
            // Тимчасова імітація успішного входу
            loginBtn.innerText = 'ВХІД...';
            loginBtn.style.opacity = '0.7';
            
            setTimeout(() => {
                alert('Успішний вхід! Зараз тут відкриється Головна сторінка.');
                loginBtn.innerText = 'УВІЙТИ';
                loginBtn.style.opacity = '1';
            }, 1000);
        }
    });
});
