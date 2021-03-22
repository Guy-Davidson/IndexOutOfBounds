import React, { useState, useEffect , useRef } from 'react';
import { Answer, DID_YOU_MEAN_ID} from '.././api';
import AnswerComponent from './Answer';

const CONTENT_MAX_SHOW_LINES = 3;

function TicketComponent(props: any) {
  const { ticket } = props;
  const [title, setTitle] = useState(ticket.title);
  const [seeMore, setSeeMore] = useState("");
  const [showAnswerEditor, setshowAnswerEditor] = useState(false);
  const [showAnswerView, setShowAnswerView] = useState("");
  const [isStared, setIsStared] = useState(ticket.isStared);
  const [isFeatured, setIsFeatured] = useState(ticket.isFeatured);
  const observed = useRef(null);
  const divStyle = {
    lineHeight: "20px",
    fontSize: "16px",
  }

  useEffect(() => {
    const div: any = observed.current;
    if(!div) return;

    const divHeight = div.offsetHeight ;
    const lineHeight = parseInt(div.style.lineHeight);
    const lines = divHeight / lineHeight;

    if(lines > CONTENT_MAX_SHOW_LINES){
      setSeeMore("See more");
      div.classList.add("minimaizeContent");
    }
  }, [observed]);

  function renameSeeMore() {
    const div: any = observed.current;
    if(!div) return;
    div.classList.toggle("minimaizeContent");

    if(seeMore === "See more"){
      setSeeMore("See less")
    } else {
      setSeeMore("See more");
    }
  }

  function renameTitle() {
    const newTitle: any = prompt("Enter new title");
    if(!newTitle || !ticket.id) return;

    props.patchTitle(newTitle, ticket.id);
    setTitle(newTitle);
  };

  function starClick() {
    if(isStared){
      setIsStared(!isStared)
      ticket.isStared = !isStared;
    } else {
      ticket.isStared = true;
      setIsStared(true);
    }
    props.patchStar(ticket.isStared, ticket.id);
  }

  function answerView() {

      let answer: Answer = ticket.answers.find((answer: Answer) => answer.creationTime === showAnswerView);
      return (
        <div className='prevAnswer'>
          <span>Answer from: {answer.email}</span><br></br><hr></hr>
          <span>{answer.reply}</span><br></br>
          <span className='prevAnswerDate'>{answer.creationTime}</span>
        </div>
      )
  }

  function renderFeaturedTicket() {
    return (
      <li key={ticket.id} className='ticket'>
      <div className='fullTitle'>
        <h5 className='title minimaizeContent'>{title}</h5>
        <div className='topRightButtons'>
          <button className='rename' onClick={renameTitle}><i className="material-icons">edit</i></button>
          <button className='expand' onClick={() => props.handleExpandClick(ticket)}>{<i className="material-icons">aspect_ratio</i>}</button>
          <button className='hide' onClick={() => props.handleHideClick(ticket)}>{<i className="material-icons">close</i>}</button>
        </div>
      </div>
      <div className='ticketContent' style={divStyle} ref={observed}>{ticket.content}</div>
      <span className='seeMore' onClick={renameSeeMore}>{seeMore}</span>
      <footer>
      <div className='metaAndStar'>
        <div className='meta-data'>By {ticket.userEmail} | { new Date(ticket.creationTime).toLocaleString()}</div>
        <div onClick={() => starClick()} className='starButton'>{<i className="material-icons">{isStared ? 'star' : 'star_border'}</i>}</div>
      </div>
      <div className='midTicket'>

          <div className='ticketAnswer'>

            {ticket.answers ? ticket.answers.map((answer: Answer) => <button key={answer.creationTime}
            onClick={() => setShowAnswerView(answer.creationTime === showAnswerView ? "" : answer.creationTime)}
            className='prevAnswers'>{answer.email.slice(0,answer.email.indexOf('@'))}</button>) : null }
          </div>


          <div className='labels'>
            {ticket.labels ? ticket.labels.map((label: "string") => <span key={label} className='label'>{label}</span>) : null }
          </div>
      </div>

      <div className='answerView'>
        <div>{showAnswerView && answerView()}</div>
      </div>

      <div className='answer'>
      <button className={!showAnswerEditor ? 'answerNPress' : 'answerYPress'}
       onClick={() => setshowAnswerEditor(!showAnswerEditor)}>{!showAnswerEditor ? '+ Add Answer' : 'Close Answer'}</button>
        {showAnswerEditor && <AnswerComponent patchAnswer={props.patchAnswer} ticketID={ticket.id} setshowAnswerEditor={setshowAnswerEditor}/>}
      </div>

      </footer>
      </li>
    )
  }

  function renderNormalTicket() {
    return (
      <li key={ticket.id} className='ticket'>
      <div className='fullTitle'>
        <h5 className='title minimaizeContent'>{title}</h5>
        <div className='topRightButtons'>
          <button className='rename' onClick={renameTitle}><i className="material-icons">edit</i></button>
          <button className='expand' onClick={() => props.handleExpandClick(ticket)}>{<i className="material-icons">aspect_ratio</i>}</button>
          <button className='hide' onClick={() => props.handleHideClick(ticket)}>{<i className="material-icons">close</i>}</button>
        </div>
      </div>
      <div className='ticketContent' style={divStyle} ref={observed}>{ticket.content}</div>
      <span className='seeMore' onClick={renameSeeMore}>{seeMore}</span>
      <footer>
      <div className='metaAndStar'>
        <div className='meta-data'>By {ticket.userEmail} | { new Date(ticket.creationTime).toLocaleString()}</div>
        <div onClick={() => starClick()} className='starButton'>{<i className="material-icons">{isStared ? 'star' : 'star_border'}</i>}</div>
      </div>
      <div className='midTicket'>

          <div className='normaltTicketAnswer'>
            {ticket.answers && <div>{ticket.answers.length} {<i className='far fa-comment-alt'></i>} </div>}
            {ticket.answers === undefined && <div> 0 {<i className='far fa-comment-alt'></i>} </div>}
          </div>


          <div className='labels'>
            {ticket.labels ? ticket.labels.map((label: "string") => <span key={label} className='label'>{label}</span>) : null }
          </div>
      </div>


      <div className='answer'>
        {showAnswerEditor && <AnswerComponent patchAnswer={props.patchAnswer} ticketID={ticket.id} setshowAnswerEditor={setshowAnswerEditor}/>}
      </div>
      <div className='answerView'>
        <div>{showAnswerView && answerView()}</div>
        <div>{isFeatured ? <span>tttttttt</span> : null}</div>
      </div>
      </footer>
      </li>
    )
  }

  function renderTicket() {
    return (
      <div>
        {isFeatured ? renderFeaturedTicket() : renderNormalTicket()}
      </div>
    )
  }

  function renderDidYouMeanTicket() {
    return (
      <div>
      <li key={ticket.id} className='ticket'>
      <span className='didYouMeanTicket' style={divStyle} ref={observed}>{ticket.title} {ticket.content}</span>
      <footer>
      <div className='meta-data didYouMeanTicketData'>By {ticket.userEmail} | { new Date(ticket.creationTime).toLocaleString()}</div>
      </footer>
        </li>
      </div>
    )
  }

  return (
    <div>
    { ticket.id !== DID_YOU_MEAN_ID ? renderTicket() : renderDidYouMeanTicket() }
    </div>
  );
}

export default TicketComponent;
