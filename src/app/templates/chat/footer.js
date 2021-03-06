const chatFooterTemplate = (channel) => `
  <div id="chat-footer" class="chat-footer">
    <form id="chat-form">
      <div class="chat-form">
        <textarea id="chat-input" class="chat-input" placeholder="Enter a message..."></textarea>
      </div>
      <div class="chat-bottom">
        <button id="settings-button" class="chat-bottom-button" title="Modclient Settings"><i class="fa fa-cog fa-fw"></i></button>
        <button id="chatters-button" class="chat-bottom-button" title="Chatters"><i class="fa fa-list fa-fw"></i></button>
      </div>
    </form>
  </div>
`;

export default chatFooterTemplate;
