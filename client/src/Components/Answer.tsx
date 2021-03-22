import React, { useState } from 'react';

function AnswerComponent(props:any) {

  const [email, setEmail] = useState("");
  const [reply, setReply] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    props.patchAnswer(email, reply, new Date().toLocaleString(), props.ticketID);
    props.setshowAnswerEditor(false);
  }

  return(
    <div>
    <form onSubmit={handleSubmit}>
    <input type='email' placeholder='Enter Your Email...' value={email} onChange={(e) => setEmail(e.target.value)}></input>
    <textarea rows={5} cols={100} placeholder='Enter Your Answer...' value={reply} onChange={(e) => setReply(e.target.value)}></textarea>
    <button>submit</button>
    </form>
    </div>
  )
}


export default AnswerComponent
