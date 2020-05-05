import React, { Component } from 'react'
import { withRouter } from 'react-router'
import axios from 'axios'

import ProfileHeader from '../components/Profile/ProfileHeader'
import ProfileManagement from '../components/Profile/ProfileManagement'
import Post from '../components/Posts/Post'

export class Profile extends Component {
  constructor (props) {
    super(props)
    this.state = {
      username: null,
      posts: [],
      popupOpen: false;
    }
  }

  componentDidMount () {
    document.title = 'Profile | myface'

    const token = window.localStorage
      ? window.localStorage.getItem('jwtToken')
      : ''

    this.setState(
      {
        token: token,
        username: this.props.location
          ? this.props.location.pathname.split('/user/').pop()
          : null
      },
      () => this.getPosts()
    )
  }

  getUser () {
    axios
      .post('/api/auth/getUser', {
        token: this.state.token,
        username: this.state.username
      })
      .then(res => {
        // Jonah, you can use this function to get needed info like: id
        // to see the output of what this API request gets you, open up the console in chrome
        console.log(res.data)

        // You can parse out the id to use for other requests (e.g. delete account and more) with res.data.id

        this.setState({
          userId: res.data.id
        })

        // And then pass the id into your components to use in axios requests
      })
      .catch(error => {
        // if err statusCode == 401, then remove token & push /login
        // otherwise log the token
        console.log(error)
      })
  }

  getPosts () {
    axios
      .post('/api/posts/getPosts', {
        token: this.state.token,
        username: this.state.username
      })
      .then(res => {
        this.setState({
          posts: res.data
        })
      })
      .catch(error => {
        // if err statusCode == 401, then remove token & push /login
        // otherwise log the token
        console.log(error)
      })
  }

  handleTogglePopupOpen(){
    this.setState({
      popupOpen: !this.state.popupOpen
    })
  }

  renderPosts () {
    if (this.state.posts.length <= 0) return
    return this.state.posts.map((post, index) => {
      return (
        <div className='post-container' key={index}>
          <Post post={post} token={this.state.token} />
        </div>
      )
    })
  }

  render () {

    const { email } = this.state

    return (
      <div>
        <ProfileHeader />
        <div className='popup' style={{display: this.state.popupOpen ? 'flex' : 'none'}}>

          <form onSubmit={this.props.handleChangeEmail}>
            <input type='email'
              name='email'
              id='email'
              onBlur={this.props.handleCheckifEmailExists}
              value
              required
            />

            <input type='submit' value='Update'/>
          </form>
        </div>

        <div className='profile-wrapper'>
          <ProfileManagement />
          <div className='profile-posts-wrapper'>{this.renderPosts()}</div>
        </div>
      </div>
    )
  }
}

export default withRouter(Profile)
