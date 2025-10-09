require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL;

const bot = new TelegramBot(token, { polling: true });

// Приветственное сообщение
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'друг';
  
  const welcomeMessage = `
🎉 <b>Привет, ${firstName}!</b>

Добро пожаловать в <b>Party Calculator</b> — умный калькулятор для расчёта расходов на мероприятиях!

💰 <b>Что я умею:</b>
- Делить расходы между участниками
- Учитывать кто что купил и кто потребляет
- Рассчитывать оптимальные переводы
- Отслеживать статус оплат
- Отправлять расчёты в мессенджеры

🚀 <b>Начните прямо сейчас:</b>
Нажмите кнопку ниже, чтобы создать своё первое мероприятие!

👨‍💻 <b>Разработчик:</b> Владимир Васякин
📧 e@mailvladimir.ru
`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '🎊 Создать мероприятие', web_app: { url: webAppUrl } }],
      [{ text: '❓ Помощь', callback_data: 'help' }]
    ]
  };

  bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'HTML',
    reply_markup: keyboard
  });
});

// Обработка кнопки "Помощь"
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  
  if (query.data === 'help') {
    const helpMessage = `
📚 <b>Как пользоваться:</b>

1️⃣ Создайте мероприятие (например: "ДР Маши 🎂")
2️⃣ Добавьте участников
3️⃣ Вносите покупки с указанием:
   • Кто заплатил
   • Кто потребляет
4️⃣ Нажмите "Рассчитать"
5️⃣ Отправьте расчёт друзьям через мессенджер

💡 <b>Фишка:</b> Можно делить расход не на всех (например, такси на двоих)

Вопросы? Пишите: e@mailvladimir.ru
`;
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });
  }
  
  bot.answerCallbackQuery(query.id);
});

// Команда /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  
  const keyboard = {
    inline_keyboard: [
      [{ text: '🎊 Открыть калькулятор', web_app: { url: webAppUrl } }]
    ]
  };

  bot.sendMessage(chatId, 'Нажмите кнопку ниже, чтобы открыть Party Calculator!', {
    reply_markup: keyboard
  });
});

console.log('🤖 Party Calculator Bot запущен!');

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.log('Ошибка:', error);
});
