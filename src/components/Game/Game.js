import React, {Component} from "react";
import Card from "../Card/Card";
import axios from "axios";
import debounce from 'lodash/debounce';
import "./Game.scss";
import {API_URL, cardValueLookup} from "../../constants/config"

export default class Game extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cards: [],
      drawnCards: [],
      previousCard: null,
      currentGuess: '',
      currentCorrectGuesses: 0,
      playerTurn: 1,
      score: {
        1: 0,
        2: 0
      },
      disableHiLoButtons: true,
      disableDrawButton: false
    };
  }

  /**
   * Get starter deck
   *
   * @returns {Promise<void>}
   */
  getDeck = async () => {
    try {
      const data = await axios.get(API_URL).then(({data}) => data);

      const cards = await axios
        .get(`https://deckofcardsapi.com/api/deck/${data.deck_id}/draw/?count=52`)
        .then(response => response.data.cards);

      this.setState({cards});
    } catch (e) {
      console.log(e.message)
    }
  }

  componentDidMount() {
    this.getDeck()
  }

  /**
   * Draw a card from the deck
   */
  drawNewCard = async () => {
    await this.setState(prevState => {
      const drawnCards = [...prevState.drawnCards, prevState.cards[prevState.cards.length - 1]]
      const previousCard = drawnCards.length > 1 ? drawnCards[drawnCards.length - 2] : null

      return ({
        cards: [...prevState.cards.slice(0, -1)],
        drawnCards,
        previousCard
      })
    }, () => {
      // after first draw in round is made, enable hi/lo buttons
      if (this.state.drawnCards.length === 1) this.setState({disableHiLoButtons: false})
    })
  }

  /**
   * Toggle a players turn
   */
  togglePlayerTurn = () => {
    this.setState(prevState => ({
      playerTurn: (prevState.playerTurn === 1) ? 2 : 1
    }));
  }

  /**
   * Calculate points
   */
  calculatePoints = () => {
    const {playerTurn, drawnCards} = this.state

    this.setState(prevState => ({
      score: {
        ...prevState.score,
        [playerTurn]: prevState.score[playerTurn] += drawnCards.length - 1
      }
    }));
  }

  /**
   * Calculate the winner for the entire game
   *
   * @returns {string}
   */
  calculateWinner = () => {
    const {score} = this.state

    if (score[1] < score[2]) return 'Player 1 Wins!'
    if (score[1] > score[2]) return 'Player 2 Wins!'
  }

  /**
   * Handle a correct guess
   */
  handleCorrectGuess = () => {
    this.setState(prevState => ({
      currentCorrectGuesses: prevState.currentCorrectGuesses += 1,
      disableHiLoButtons: false
    }));
  }

  /**
   * Handle a wrong guess
   */
  handleWrongGuess = () => {
    this.togglePlayerTurn()
    this.calculatePoints()

    this.setState({
      previousCard: null,
      currentCorrectGuesses: 0,
      disableHiLoButtons: true,
      disableDrawButton: true
    });

    // show last drawn card for 2 seconds before resetting the round
    setTimeout(() => {
      this.setState({
        drawnCards: [],
        disableDrawButton: false
      })
    }, 2000)
  }

  /**
   * Check if an guess is correct
   *
   * @param currentGuess
   * @returns {string|boolean}
   */
  isGuessCorrect = (currentGuess) => {
    const {previousCard, drawnCards} = this.state
    const currentCard = drawnCards[drawnCards.length - 1]

    // correct guess
    if (
      (currentGuess === 'higher' && (cardValueLookup[currentCard.value] >= cardValueLookup[previousCard.value])) ||
      (currentGuess === 'lower' && (cardValueLookup[currentCard.value] <= cardValueLookup[previousCard.value]))
    ) {
      this.handleCorrectGuess()
      return true
    }
    // incorrect guess
    else if (currentGuess) {
      this.handleWrongGuess()
      return false
    } else {
      return 'no current guess'
    }
  }

  /**
   * Handle a guess
   *
   * @param currentGuess
   */
  handleGuess = debounce((currentGuess) => {
    // disable higher/lower button temporarily and set correct current
    this.setState({
      disableHiLoButtons: true,
      currentGuess
    })

    this.drawNewCard()
      .then(() => this.isGuessCorrect(currentGuess))
  }, 500)

  /**
   * Handle a pass
   */
  handlePass = () => {
    this.togglePlayerTurn()

    this.setState({
      currentGuess: '',
      currentCorrectGuesses: 0
    })
  }

  /**
   * Reset the game
   */
  resetGame = () => {
    this.getDeck()

    this.setState({
      cards: [],
      drawnCards: [],
      previousCard: null,
      currentGuess: '',
      playerTurn: 1,
      score: {1: 0, 2: 0}
    })
  }

  render() {
    const {cards, drawnCards, playerTurn, score, currentGuess, currentCorrectGuesses, previousCard, disableDrawButton, disableHiLoButtons} = this.state;
    const currentPlayer = (playerTurn === 1) ? 2 : 1;

    // disable hi/lo buttons at the beginning/end of game or on certain conditions of state
    const hiloButtonsDisabled = (cards.length <= 0 || cards.length === 52 || disableHiLoButtons)
    // disable draw button at the end of game or when a previous card exists or when hi/lo button is disabled or on certain state conditions
    const drawButtonDisabled = (cards.length <= 0) || previousCard || !hiloButtonsDisabled || disableDrawButton
    // disable draw button at the end of game or when there are less than 3 correct guesses
    const passButtonDisabled = (cards.length <= 0) || (currentCorrectGuesses < 3)

    let cardDisplay = ''
    if (drawnCards.length > 0 && cards.length !== 0) {
      cardDisplay = drawnCards.map((e, i) => (
        <Card key={i} src={e.image}/>
      ));
    } else if (currentGuess && cards.length !== 0) {
      cardDisplay = <p>Player {currentPlayer} lost this round</p>
    } else if (cards.length !== 0) {
      cardDisplay = <p>Player 1 goes first</p>
    } else if (cards.length <= 0) {
      cardDisplay = <h1>{this.calculateWinner()}</h1>
    }

    return (
      <div className="Game">
        <h1 className="Game-title">High / Low Card Game</h1>
        {(cards.length > 0) && <h2 className="Game-subtitle">Player {playerTurn} Goes!</h2>}
        <h3 className="Game-subtitle">Cards Left: {cards.length}</h3>
        {(cards.length > 0) && <h3 className="Game-subtitle">Point on the line: {(drawnCards.length <= 1) ? 0 : drawnCards.length - 1}</h3>}
        <h3 className="Game-subtitle">Player 1 Score: {score[1]}</h3>
        <h3 className="Game-subtitle">Player 2 Score: {score[2]}</h3>

        <div className="Game-btn-container">
          <button
            className={"Game-btn" + (hiloButtonsDisabled ? ' hidden' : '')}
            value="higher"
            onClick={(e) => this.handleGuess(e.target.value)}
            disabled={hiloButtonsDisabled}
          >
            Higher
          </button>

          <button
            className={"Game-btn" + (passButtonDisabled ? ' hidden' : '')}
            value="higher"
            onClick={this.handlePass}
            disabled={passButtonDisabled}
          >
            Pass
          </button>

          <button
            className={"Game-btn" + (drawButtonDisabled ? ' hidden' : '')}
            value="higher"
            onClick={this.drawNewCard}
            disabled={drawButtonDisabled}
          >
            Draw
          </button>

          <button
            className={"Game-btn" + (hiloButtonsDisabled ? ' hidden' : '')}
            value="lower"
            onClick={(e) => this.handleGuess(e.target.value)}
            disabled={hiloButtonsDisabled}
          >
            Lower
          </button>
        </div>

        <div className="Game-deck">{cardDisplay}</div>

        <button
          className="Game-btn"
          onClick={this.resetGame}
        >
          Reset Game
        </button>
      </div>
    );
  }
}
