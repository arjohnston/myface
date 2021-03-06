import React, { Component } from 'react'
import axios from 'axios'

import AttachmentInput from '../Attachment/Attachment'

import 'emoji-mart/css/emoji-mart.css'
import { Picker } from 'emoji-mart'

import { connect } from 'react-redux'

import {
  sendSocketMessage,
  startTyping,
  stopTyping
} from '../../actions/index'

import './style.css'

export class MessageBox extends Component {
  constructor (props) {
    super(props)
    this.state = {
      userSelected: null,
      messages: [],
      messageInput: '',
      conversationId: null,
      friendSearchInputText: '',
      friends: [],
      filteredFriends: [],
      attachmentInputShown: false,
      imageLoadedSrc: '',
      imageLoadedName: '',
      openImageViewer: false,
      imageViewerSrc: '',
      imageViewerName: '',
      onlineUsers: [],
      userSelectedIsTyping: false,
      usersTyping: [],
      backButtonPressed: false,
      emojiMenuOpen: false
    }

    this.renderMessages = this.renderMessages.bind(this)
    this.handleSendMessage = this.handleSendMessage.bind(this)
    this.handleInputChange = this.handleInputChange.bind(this)
    this.handleKeyPress = this.handleKeyPress.bind(this)
    this.handleSearchFriendListChange = this.handleSearchFriendListChange.bind(
      this
    )
    this.renderFilteredFriends = this.renderFilteredFriends.bind(this)
    this.handleToggleAttachmentInputShown = this.handleToggleAttachmentInputShown.bind(
      this
    )
    this.handleFileInput = this.handleFileInput.bind(this)
    this.handleDeleteImage = this.handleDeleteImage.bind(this)

    this.handleEmojiMouseEnter = this.handleEmojiMouseEnter.bind(this)
    this.handleEmojiMouseLeave = this.handleEmojiMouseLeave.bind(this)

    this.chatBottom = React.createRef()
    this.chatInput = React.createRef()
    this.newConversationInput = React.createRef()

    this.typingTimer = null
  }

  componentDidMount () {
    const token = window.localStorage
      ? window.localStorage.getItem('jwtToken')
      : ''

    this.setState(
      {
        token: token,
        userSelected: this.props.userSelected
      },
      () => this.getConversationMessages()
    )
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevState.friends !== this.state.friends) {
      this.setState({
        friends: this.state.friends
      })
    }

    if (prevState.onlineUsers !== this.state.onlineUsers) {
      this.setState({
        onlineUsers: this.state.onlineUsers
      })
    }

    if (prevState.receivedMessage !== this.state.receivedMessage) {
      this.setState({
        receivedMessage: this.state.receivedMessage
      })

      this.appendMessage(this.state.receivedMessage)
    }

    if (prevState.usersTyping !== this.state.usersTyping) {
      this.setState({
        usersTyping: this.state.usersTyping
      }, () => this.scrollIntoView(true))
    }

    if (prevState.userSelected !== this.state.userSelected) {
      if (prevState.userSelected && this.state.userSelected && prevState.userSelected._id === this.state.userSelected._id) return

      this.setState(
        {
          userSelected: this.state.userSelected,
          messages: [],
          conversationId: null
        },
        () => {
          this.getConversationMessages()
          if (!this.state.userSelected && !this.state.backButtonPressed) {
            this.newConversationInput.current.focus()
          }

          this.setState({
            backButtonPressed: false
          })
        }
      )
    }
  }

  static getDerivedStateFromProps (nextProps, prevState) {
    if (nextProps.userSelected !== prevState.userSelected) {
      return { userSelected: nextProps.userSelected }
    } else if (nextProps.friends !== prevState.friends) {
      return { friends: nextProps.friends }
    } else if (nextProps.onlineUsers !== prevState.onlineUsers) {
      return { onlineUsers: nextProps.onlineUsers }
    } else if (nextProps.receivedMessage !== prevState.receivedMessage) {
      return { receivedMessage: nextProps.receivedMessage }
    } else if (nextProps.usersTyping !== prevState.usersTyping) {
      return { usersTyping: nextProps.usersTyping }
    } else return null
  }

  componentWillUnmount () {
    if (this.typingTimer) clearTimeout(this.typingTimer)
  }

  appendMessage (message) {
    if (
      message.conversation !== this.state.conversationId &&
      this.state.conversationId
    ) {
      return
    }

    this.setState(
      {
        messages: [...this.state.messages, message]
      },
      () => {
        this.scrollIntoView(true)
        this.props.refreshConversationList()
      }
    )
  }

  getConversationMessages () {
    if (!this.state.userSelected) return

    axios
      .post('/api/messages/getConversationMessages', {
        token: this.state.token,
        userId: this.state.userSelected._id
      })
      .then(res => {
        if (res.data.length < 1 || !res.data[0].conversation) return

        this.setState(
          {
            conversationId: res.data[0].conversation,
            messages: res.data
          },
          () => {
            this.scrollIntoView()
            this.setInputIntoFocus()
          }
        )
      })
      .catch(err => console.log(err))
  }

  scrollIntoView (effect) {
    if (!this.chatBottom.current) return
    if (!this.state.userSelected) return

    if (effect) {
      return this.chatBottom.current.scrollIntoView({ behavior: 'smooth' })
    }

    if (window && window.innerWidth < 767) {
      setTimeout(() => {
        this.chatBottom.current.scrollIntoView()
      }, 300)
    } else {
      this.chatBottom.current.scrollIntoView()
    }
  }

  setInputIntoFocus () {
    if (!this.state.userSelected) return
    this.chatInput.current.focus()
  }

  handleKeyPress (e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      this.handleSendMessage()
    }
  }

  handleInputChange (e) {
    this.setState({
      messageInput: e.target.value
    })

    this.startTyping()
  }

  handleSelectEmoji (e) {
    this.setState({
      messageInput: this.state.messageInput + e,
      emojiMenuOpen: false
    })
  }

  handleEmojiMouseEnter () {
    this.setState({
      emojiMenuOpen: true
    })
  }

  handleEmojiMouseLeave () {
    this.setState({
      emojiMenuOpen: false
    })
  }

  // Emit that I started typing
  startTyping () {
    // If the timer is null, then this is the first time the user is typing
    if (!this.typingTimer) this.props.startTyping(this.props.user.userId)

    // Clearout the timer...
    if (this.typingTimer) clearTimeout(this.typingTimer)

    this.typingTimer = setTimeout(() => {
      this.typingTimer = null
      this.stopTyping()
    }, 5000) // 5s
  }

  // Emit that I'm not typing anymore
  stopTyping () {
    this.props.stopTyping(this.props.user.userId)
  }

  handleSendMessage (e) {
    if (e) e.preventDefault()

    if (!this.state.userSelected) return
    if (this.state.messageInput === '' && this.state.imageLoadedSrc === '') {
      return
    }

    this.stopTyping(this.props.user.userId)

    const payload = {
      token: this.state.token,
      to: this.state.userSelected._id
    }

    if (this.state.messageInput !== '' && this.state.imageLoadedSrc === '') {
      payload.message = this.state.messageInput
      payload.type = 'message'
    }

    if (this.state.imageLoadedSrc !== '') {
      payload.data = this.state.imageLoadedSrc
      payload.name = this.state.imageLoadedName
      payload.type = 'image'
    }

    axios
      .post('/api/messages/sendMessage', payload)
      .then((res) => {
        this.setState({
          messageInput: '',
          imageLoadedSrc: '',
          imageLoadedName: ''
        })

        payload.conversation = res.data.conversationId
        payload.date = Date.now()
        payload.from = this.props.user.userId
        delete payload.token

        this.props.sendSocketMessage(payload)
        this.appendMessage(payload)
      })
      .catch(err => console.log(err))
  }

  handleSearchFriendListChange (e) {
    const value = e.target.value

    this.setState({
      friendSearchInputText: value
    })

    if (this.searchFriendListCallback) {
      clearTimeout(this.searchFriendListCallback)
    }

    if (this.state.friends.length <= 0) return

    if (value === '') return this.setState({ filteredFriends: [] })

    const callback = () => {
      const filteredFriends = this.state.friends.filter(friend => {
        const name = friend.firstName + ' ' + friend.lastName
        return name.toLowerCase().indexOf(value.toLowerCase()) !== -1
      })

      this.setState({
        filteredFriends: filteredFriends
      })

      delete this.searchFriendListCallback
    }

    this.searchFriendListCallback = setTimeout(callback, 500)
  }

  renderFilteredFriends () {
    if (this.state.filteredFriends.length <= 0) return

    return this.state.filteredFriends.map((friend, index) => {
      return (
        <div
          key={index}
          className='filtered-friend-row'
          onClick={this.handleCreateNewConversation.bind(this, friend)}
        >
          <span>{`${friend.firstName} ${friend.lastName}`}</span>
        </div>
      )
    })
  }

  handleCreateNewConversation (friendSelected) {
    this.setState({
      filteredFriends: [],
      friendSearchInputText: ''
    })

    // Check if there is an existing conversation, if so use that
    this.setState({
      userSelected: friendSelected
    })

    this.props.selectUser(friendSelected)
  }

  handleGoBack () {
    // this.chatInput.current.blur()
    // this.newConversationInput.current.blur()

    // if (document) document.activeElement.blur()

    this.setState({
      backButtonPressed: true
    })

    this.props.selectUser(null)
  }

  toggleOpenImageViewer (message) {
    this.setState({
      openImageViewer: message !== null,
      imageViewerSrc: message === null ? '' : message.data,
      imageViewerName: message === null ? '' : message.name
    })
  }

  renderMessages () {
    if (!this.state.messages || !this.state.userSelected) return

    const MONTHS = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC'
    ]

    let prevMessageMonth = null
    let prevMessageDate = null

    return (
      <div>
        {this.state.messages.map((message, index) => {
          let classes = 'message'
          if (message.to === this.state.userSelected._id) classes += ' to'

          const date = new Date(message.date)
          const month = date.getMonth()
          const day = date.getDate()
          let hours = date.getHours()
          let minutes = date.getMinutes()
          const label = hours >= 12 ? ' PM' : ' AM'
          if (hours > 12) hours = hours - 12
          if (hours === 0) hours = 12
          if (minutes < 10) minutes = '0' + minutes
          const formattedDate = hours + ':' + minutes + label

          let shouldInsertDateBreak = false
          if (prevMessageMonth && prevMessageDate) {
            if (prevMessageMonth < month) shouldInsertDateBreak = true

            if (prevMessageMonth <= month && prevMessageDate < day) {
              shouldInsertDateBreak = true
            }
          }

          prevMessageMonth = month
          prevMessageDate = day

          const name =
            message.from === this.state.userSelected._id
              ? this.state.userSelected.firstName + ' ' + this.state.userSelected.lastName
              : this.props.user.firstName + ' ' + this.props.user.lastName

          const profileImg = message.from === this.state.userSelected._id
            ? this.state.userSelected.profileImg
            : this.props.user.profileImg

          return (
            <div key={index}>
              {shouldInsertDateBreak && (
                <div className='message-date-break'>
                  <span>
                    {MONTHS[month]} {day}
                  </span>
                </div>
              )}

              <div className={classes}>
                <div className='message-profile-img'>
                  {profileImg ? (
                    <img
                      src={profileImg}
                      alt={name}
                    />
                  ) : (
                    <svg viewBox='0 0 24 24'>
                      <path d='M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z' />
                    </svg>
                  )}
                </div>
                <div className='message-container'>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}
                  >
                    {name && <span className='message-name'>{name}</span>}
                    {name && <div className='message-name-break' />}
                    <span className='timestamp'>{formattedDate}</span>
                  </div>
                  {message.type === 'message' && <span>{message.message}</span>}
                  {message.type === 'image' && (
                    <div className='message-image-wrapper'>
                      <img
                        src={message.data}
                        alt={message.name}
                        title={message.name}
                        onClick={this.toggleOpenImageViewer.bind(this, message)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {this.state.usersTyping.includes(this.state.userSelected._id) && (
          <div className='message'>
            <div className='message-profile-img'>
              {this.state.userSelected.profileImg ? (
                <img
                  src={this.state.userSelected.profileImg}
                  alt={this.state.userSelected.firstName + ' ' + this.state.userSelected.lastName}
                />
              ) : (
                <svg viewBox='0 0 24 24'>
                  <path d='M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z' />
                </svg>
              )}
            </div>
            <div className='message-container'>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}
              >
                {this.state.userSelected.firstName && <span className='message-name'>{this.state.userSelected.firstName + ' ' + this.state.userSelected.lastName}</span>}
              </div>
              <div className='user-typing'>
                <div className='user-typing-bubble' />
                <div className='user-typing-bubble' />
                <div className='user-typing-bubble' />
              </div>
            </div>
          </div>
        )}

        <div ref={this.chatBottom} />
      </div>
    )
  }

  handleToggleAttachmentInputShown () {
    this.setState({
      attachmentInputShown: !this.state.attachmentInputShown
    })
  }

  handleFileInput (files) {
    // Save file
    if (files && files[0]) {
      const reader = new FileReader()
      reader.readAsDataURL(files[0])

      reader.onload = readerEvent => {
        this.setState({
          imageLoadedSrc: readerEvent.target.result,
          imageLoadedName: files[0].name
        })
      }
    }

    this.handleToggleAttachmentInputShown()
  }

  handleDeleteImage () {
    this.setState({
      imageLoadedSrc: '',
      imageLoadedName: ''
    })
  }

  render () {
    if (!this.state.userSelected) {
      return (
        <div className='message-box'>
          <div
            style={{ display: this.state.openImageViewer ? 'flex' : 'none' }}
            className='image-viewer'
            onClick={this.toggleOpenImageViewer.bind(this, null)}
          >
            <div className='image-viewer-wrapper'>
              <img
                src={this.state.imageViewerSrc}
                alt={this.state.imageViewerName}
              />
              <span>{this.state.imageViewerName}</span>

              <div className='close-button'>
                <svg viewBox='0 0 24 24'>
                  <path d='M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z' />
                </svg>
              </div>
            </div>
          </div>

          <div
            style={{
              display: this.state.attachmentInputShown ? 'block' : 'none'
            }}
          >
            <AttachmentInput
              onCloseAttachment={this.handleToggleAttachmentInputShown}
              onFileInput={this.handleFileInput}
              isOpen={this.state.attachmentInputShown}
            />
          </div>

          <div className='friend-header-new'>
            <div className='friend-header-new-title-wrapper'>
              <div className='mobile-back-button' onClick={this.handleGoBack.bind(this)}>
                <svg viewBox='0 0 24 24'>
                  <path d='M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z' />
                </svg>
              </div>

              <span>New message</span>
            </div>

            <input
              type='text'
              placeholder='Start typing a name...'
              value={this.state.friendSearchInputText}
              onChange={this.handleSearchFriendListChange}
              ref={this.newConversationInput}
            />

            {this.state.filteredFriends.length > 0 && (
              <div className='search-results'>
                {this.renderFilteredFriends()}
              </div>
            )}
          </div>

          <div className='messages'>
            {this.renderMessages()}
          </div>

          <div className='message-cta-container'>
            <div className='message-input'>
              <div className='profile-img'>
                {this.props.user.profileImg ? (
                  <img
                    src={this.props.user.profileImg}
                    alt={`${this.props.user.firstName} ${this.props.user.lastName}`}
                  />
                ) : (
                  <svg viewBox='0 0 24 24'>
                    <path d='M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z' />
                  </svg>
                )}
              </div>
              {this.state.imageLoadedSrc && this.state.imageLoadedName ? (
                <div className='message-input-image'>
                  <img
                    src={this.state.imageLoadedSrc}
                    alt={this.state.imageLoadedName}
                  />
                  <div className='message-input-image-title'>
                    <span>{this.state.imageLoadedName}</span>
                    <svg viewBox='0 0 24 24' onClick={this.handleDeleteImage}>
                      <path d='M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z' />
                    </svg>
                  </div>
                </div>
              ) : (
                <textarea
                  placeholder='Whats on your mind?'
                  onChange={this.handleInputChange}
                  value={this.state.messageInput}
                  onKeyDown={this.handleKeyPress}
                  ref={this.chatInput}
                />
              )}
            </div>

            <div className='message-cta'>
              <div
                className='attachment-wrapper'
                onClick={this.handleToggleAttachmentInputShown.bind(this)}
              >
                <svg viewBox='0 0 24 24'>
                  <path d='M19,19H5V5H19M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M13.96,12.29L11.21,15.83L9.25,13.47L6.5,17H17.5L13.96,12.29Z' />
                </svg>
              </div>
              <div className={`emoji-wrapper ${this.state.emojiMenuOpen ? 'is-open' : ''}`} onMouseEnter={this.handleEmojiMouseEnter} onMouseLeave={this.handleEmojiMouseLeave}>
                <svg viewBox='0 0 24 24'>
                  <path d='M12,17.5C14.33,17.5 16.3,16.04 17.11,14H6.89C7.69,16.04 9.67,17.5 12,17.5M8.5,11A1.5,1.5 0 0,0 10,9.5A1.5,1.5 0 0,0 8.5,8A1.5,1.5 0 0,0 7,9.5A1.5,1.5 0 0,0 8.5,11M15.5,11A1.5,1.5 0 0,0 17,9.5A1.5,1.5 0 0,0 15.5,8A1.5,1.5 0 0,0 14,9.5A1.5,1.5 0 0,0 15.5,11M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z' />
                </svg>

                <div className='emoji-picker'>
                  <Picker
                    title={null}
                    showPreview={false}
                    showSkinTones={false}
                    style={{
                      position: 'absolute',
                      bottom: '0px',
                      right: '0px'
                    }}
                    onClick={emoji => this.handleSelectEmoji(emoji.native)}
                  />
                </div>
              </div>
              <input
                type='submit'
                value='Send'
                onClick={this.handleSendMessage}
              />
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className='message-box'>
        <div
          style={{ display: this.state.openImageViewer ? 'flex' : 'none' }}
          className='image-viewer'
          onClick={this.toggleOpenImageViewer.bind(this, null)}
        >
          <div className='image-viewer-wrapper'>
            <img
              src={this.state.imageViewerSrc}
              alt={this.state.imageViewerName}
            />
            <span>{this.state.imageViewerName}</span>

            <div className='close-button'>
              <svg viewBox='0 0 24 24'>
                <path d='M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z' />
              </svg>
            </div>
          </div>
        </div>

        <div
          style={{
            display: this.state.attachmentInputShown ? 'block' : 'none'
          }}
        >
          <AttachmentInput
            onCloseAttachment={this.handleToggleAttachmentInputShown}
            onFileInput={this.handleFileInput}
            isOpen={this.state.attachmentInputShown}
          />
        </div>

        <div className='friend-header'>
          <div className='mobile-back-button' onClick={this.handleGoBack.bind(this)}>
            <svg viewBox='0 0 24 24'>
              <path d='M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z' />
            </svg>
          </div>
          <div className='friend-header-img'>
            {this.state.userSelected.profileImg ? (
              <img
                src={this.state.userSelected.profileImg}
                alt={`${this.state.userSelected.firstName} ${this.state.userSelected.lastName}`}
              />
            ) : (
              <svg viewBox='0 0 24 24'>
                <path d='M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z' />
              </svg>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>{this.state.userSelected.firstName ? this.state.userSelected.firstName + ' ' + this.state.userSelected.lastName : 'Your Friend'}</span>
            {this.state.onlineUsers && this.state.onlineUsers.map((user) => user.userId).includes(this.state.userSelected._id) && <span className='friend-online'>online</span>}
          </div>
        </div>

        <div className='messages'>{this.renderMessages()}</div>

        <div className='message-cta-container'>
          <div className='message-input'>
            <div className='profile-img'>
              {this.props.user.profileImg ? (
                <img
                  src={this.props.user.profileImg}
                  alt={`${this.props.user.firstName} ${this.props.user.lastName}`}
                />
              ) : (
                <svg viewBox='0 0 24 24'>
                  <path d='M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z' />
                </svg>
              )}
            </div>
            {this.state.imageLoadedSrc && this.state.imageLoadedName ? (
              <div className='message-input-image'>
                <img
                  src={this.state.imageLoadedSrc}
                  alt={this.state.imageLoadedName}
                />
                <div className='message-input-image-title'>
                  <span>{this.state.imageLoadedName}</span>
                  <svg viewBox='0 0 24 24' onClick={this.handleDeleteImage}>
                    <path d='M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z' />
                  </svg>
                </div>
              </div>
            ) : (
              <textarea
                placeholder='Whats on your mind?'
                onChange={this.handleInputChange}
                value={this.state.messageInput}
                onKeyDown={this.handleKeyPress}
                ref={this.chatInput}
              />
            )}
          </div>

          <div className='message-cta'>
            <div
              className='attachment-wrapper'
              onClick={this.handleToggleAttachmentInputShown.bind(this)}
            >
              <svg viewBox='0 0 24 24'>
                <path d='M19,19H5V5H19M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M13.96,12.29L11.21,15.83L9.25,13.47L6.5,17H17.5L13.96,12.29Z' />
              </svg>
            </div>
            <div className={`emoji-wrapper ${this.state.emojiMenuOpen ? 'is-open' : ''}`} onMouseEnter={this.handleEmojiMouseEnter} onMouseLeave={this.handleEmojiMouseLeave}>
              <svg viewBox='0 0 24 24'>
                <path d='M12,17.5C14.33,17.5 16.3,16.04 17.11,14H6.89C7.69,16.04 9.67,17.5 12,17.5M8.5,11A1.5,1.5 0 0,0 10,9.5A1.5,1.5 0 0,0 8.5,8A1.5,1.5 0 0,0 7,9.5A1.5,1.5 0 0,0 8.5,11M15.5,11A1.5,1.5 0 0,0 17,9.5A1.5,1.5 0 0,0 15.5,8A1.5,1.5 0 0,0 14,9.5A1.5,1.5 0 0,0 15.5,11M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z' />
              </svg>

              <div className='emoji-picker'>
                <Picker
                  title={null}
                  showPreview={false}
                  showSkinTones={false}
                  style={{ position: 'absolute', bottom: '0px', right: '0px' }}
                  onClick={emoji => this.handleSelectEmoji(emoji.native)}
                />
              </div>
            </div>
            <input
              type='submit'
              value='Send'
              onClick={this.handleSendMessage}
            />
          </div>
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => ({
  ...state
})

const mapDispatchToProps = dispatch => ({
  sendSocketMessage: payload => dispatch(sendSocketMessage(payload)),
  startTyping: payload => dispatch(startTyping(payload)),
  stopTyping: payload => dispatch(stopTyping(payload))
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MessageBox)
